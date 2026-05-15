#include "exchange/BaseExchange.h"
#include "datapipeline/dataPipeline.h"
#include "strategy/ImbalanceStrategy.h"
#include "executor/executor.h"
#include "executor/WebSocketServer.h"
#include <iostream>
#include <csignal>
#include <atomic>

std::atomic<bool> running{true};
net::io_context ioc;

void signal_handler(int signal) {
    running = false;
    ioc.stop();
}

int main() {
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);
    
    try {
        // Start WebSocket Server for Frontend
        auto const address = net::ip::make_address("0.0.0.0");
        auto const port = static_cast<unsigned short>(9001);
        auto ws_server = std::make_shared<WebSocketServer>(ioc, tcp::endpoint{address, port});
        ws_server->run();
        
        std::thread ioc_thread([]() { ioc.run(); });

        auto strategy = std::make_shared<ImbalanceStrategy>();
        auto jupiter = std::make_shared<Exchange1>();
        auto executor = std::make_shared<Executor>(jupiter);
        auto& pipeline = DataPipeline::get_instance();
        
        pipeline.register_exchange(jupiter);
        
        pipeline.set_data_handler([strategy, executor, ws_server](const MarketData& data) {
            // Broadcast Market Data to Frontend
            nlohmann::json md_json = data.to_json();
            md_json["type"] = "MARKET_DATA";
            ws_server->broadcast(md_json);

            Signal signal = strategy->onMarketData(data);
            if (signal.type != SignalType::NONE) {
                // Broadcast Signal
                nlohmann::json sig_json;
                sig_json["type"] = "SIGNAL";
                sig_json["symbol"] = signal.symbol;
                sig_json["side"] = (signal.type == SignalType::BUY ? "BUY" : "SELL");
                sig_json["price"] = signal.price;
                sig_json["timestamp"] = signal.timestamp;
                ws_server->broadcast(sig_json);

                executor->execute(signal);
            }
        });
        
        pipeline.start();
        
        std::vector<std::string> symbols = {"SOL-PERP", "BTC-PERP", "ETH-PERP"};
        pipeline.subscribe_all(symbols);
        
        std::cout << "[MAIN] HFT System Active. WebSocket Server: ws://localhost:9001" << std::endl;
        
        while (running) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        pipeline.stop();
        if (ioc_thread.joinable()) ioc_thread.join();
        
    } catch (const std::exception& e) {
        std::cerr << "[MAIN] Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}