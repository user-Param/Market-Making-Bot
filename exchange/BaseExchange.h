#pragma once

#include <string>
#include <vector>
#include <functional>
#include <thread>
#include <atomic>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <queue>
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/asio/ssl.hpp>
#include <nlohmann/json.hpp>
#include <optional>

namespace net = boost::asio;
namespace ssl = boost::asio::ssl;
namespace beast = boost::beast;
namespace http = beast::http;
namespace websocket = beast::websocket;
using tcp = net::ip::tcp;

// Standardized market data structure for all exchanges
struct MarketData {
    std::string exchange_id;
    std::string symbol;
    double price;
    double bid;
    double ask;
    double bid_qty;
    double ask_qty;
    long timestamp;
    
    nlohmann::json to_json() const {
        return {
            {"exchange_id", exchange_id},
            {"symbol", symbol},
            {"price", price},
            {"bid", bid},
            {"ask", ask},
            {"bid_qty", bid_qty},
            {"ask_qty", ask_qty},
            {"timestamp", timestamp}
        };
    }
};

// Standardized callback signature
using PriceCallback = std::function<void(const MarketData&)>;

// Base Exchange Interface
class BaseExchange {
public:
    virtual ~BaseExchange() = default;
    virtual void connect() = 0;
    virtual void subscribe(const std::vector<std::string>& symbols) = 0;
    virtual void set_callback(PriceCallback callback) = 0;
    virtual std::string get_exchange_id() const = 0;
};

// Exchange1 - Jupiter Perpetuals Implementation
class Exchange1 : public BaseExchange {
public:
    Exchange1();
    ~Exchange1() override;
    
    void connect() override;
    void subscribe(const std::vector<std::string>& symbols) override;
    void set_callback(PriceCallback callback) override;
    std::string get_exchange_id() const override { return "JUPITER"; }

private:
    void stream_loop();
    void fast_parse_and_callback(const std::string& body, const std::string& symbol);
    
    net::io_context ioc_;
    ssl::context ctx_{ssl::context::tlsv12_client};
    
    // Persistent SSL Stream for HFT Speed
    std::unique_ptr<beast::ssl_stream<beast::tcp_stream>> stream_;
    
    std::atomic<bool> connected_{false};
    std::atomic<bool> running_{false};
    PriceCallback callback_;
    
    std::vector<std::string> subscribed_symbols_;
    std::thread stream_thread_;
    mutable std::mutex symbols_mutex_;
    
    const std::string host_ = "perps-api.jup.ag";
    const std::string port_ = "443";
};