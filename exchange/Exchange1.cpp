#include "BaseExchange.h"
#include <iostream>
#include <chrono>
#include <thread>
#include <string_view>

static const std::unordered_map<std::string, std::string> SYMBOL_TO_MINT = {
    {"SOL-PERP", "So11111111111111111111111111111111111111112"},
    {"BTC-PERP", "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"},
    {"ETH-PERP", "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"},
    {"SOL", "So11111111111111111111111111111111111111112"},
    {"BTC", "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"},
    {"ETH", "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"}
};

Exchange1::Exchange1() {
    ctx_.set_verify_mode(ssl::verify_none);
}

Exchange1::~Exchange1() {
    running_ = false;
    connected_ = false;
    if (stream_thread_.joinable()) stream_thread_.join();
}

void Exchange1::connect() {
    if (connected_) return;

    try {
        tcp::resolver resolver(ioc_);
        auto const results = resolver.resolve(host_, port_);

        stream_ = std::make_unique<beast::ssl_stream<beast::tcp_stream>>(ioc_, ctx_);

        // Set SNI Hostname
        if (!SSL_set_tlsext_host_name(stream_->native_handle(), host_.c_str())) {
            throw beast::system_error(beast::error_code(static_cast<int>(::ERR_get_error()), net::error::get_ssl_category()));
        }

        // Connect and Handshake
        beast::get_lowest_layer(*stream_).connect(results);
        stream_->handshake(ssl::stream_base::client);

        connected_ = true;
        running_ = true;

        std::cout << "[JUPITER] HFT Persistent Stream Connected" << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "[JUPITER] Connection failed: " << e.what() << std::endl;
    }
}

void Exchange1::subscribe(const std::vector<std::string>& symbols) {
    if (!connected_) return;

    {
        std::lock_guard<std::mutex> lock(symbols_mutex_);
        subscribed_symbols_ = symbols;
    }

    if (!stream_thread_.joinable()) {
        stream_thread_ = std::thread(&Exchange1::stream_loop, this);
    }
}

void Exchange1::set_callback(PriceCallback callback) {
    callback_ = std::move(callback);
}

void Exchange1::stream_loop() {
    while (running_ && connected_) {
        std::vector<std::string> symbols;
        {
            std::lock_guard<std::mutex> lock(symbols_mutex_);
            symbols = subscribed_symbols_;
        }

        for (const auto& symbol : symbols) {
            auto it = SYMBOL_TO_MINT.find(symbol);
            if (it == SYMBOL_TO_MINT.end()) continue;
            std::string mint = it->second;

            try {
                // HFT: Reuse the same SSL stream with Keep-Alive
                http::request<http::empty_body> req{http::verb::get, "/v1/market-stats?mint=" + mint, 11};
                req.set(http::field::host, host_);
                req.set(http::field::user_agent, "ArbBot/1.0");
                req.set(http::field::connection, "keep-alive");

                http::write(*stream_, req);

                beast::flat_buffer buffer;
                http::response<http::string_body> res;
                http::read(*stream_, buffer, res);

                if (res.result() == http::status::ok) {
                    fast_parse_and_callback(res.body(), symbol);
                }
            } catch (const std::exception& e) {
                std::cerr << "[JUPITER] Stream error: " << e.what() << std::endl;
                connected_ = false;
                break;
            }
        }
        // Minimal sleep for high-speed polling (e.g., 10ms total per loop)
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
}

void Exchange1::fast_parse_and_callback(const std::string& body, const std::string& symbol) {
    // Zero-allocation style scanning
    std::string_view msg(body);
    
    size_t price_pos = msg.find("\"price\":\"");
    if (price_pos == std::string_view::npos) return;

    size_t price_start = price_pos + 9;
    size_t price_end = msg.find("\"", price_start);
    std::string_view price_str = msg.substr(price_start, price_end - price_start);

    try {
        double price = std::stod(std::string(price_str));
        
        MarketData md;
        md.exchange_id = "JUPITER";
        md.symbol = symbol;
        md.price = price;
        
        // HFT Spread (0.06% open fee)
        double fee_factor = 0.0006;
        md.bid = price * (1.0 - fee_factor);
        md.ask = price * (1.0 + fee_factor);
        md.bid_qty = 1000.0;
        md.ask_qty = 1000.0;
        md.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();

        if (callback_) {
            callback_(md);
        }
    } catch (...) {}
}