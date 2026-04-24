#include "exchange/BaseExchange.h"
#include "datapipeline/dataPipeline.h"
#include "strategy/ImbalanceStrategy.h"
#include <iostream>
#include <csignal>
#include <atomic>

std::atomic<bool> running{true};

void signal_handler(int signal) {
    running = false;
}

int main() {
    // Set up signal handling for graceful shutdown
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);
    
    try {
        // Instantiate the strategy
        auto strategy = std::make_shared<ImbalanceStrategy>();
        
        // Create exchange instances
        auto jupiter = std::make_shared<Exchange1>();
        
        // Get pipeline instance
        auto& pipeline = DataPipeline::get_instance();
        
        // Register exchanges
        pipeline.register_exchange(jupiter);
        
        // Connect Datafeed to Strategy
        pipeline.set_data_handler([strategy](const MarketData& data) {
            // 1. Process data through the strategy
            Signal signal = strategy->onMarketData(data);
            
            // 2. Log high-speed feed update
            // std::cout << "[FEED] " << data.symbol << " | Price: " << data.price 
            //           << " | BidQty: " << data.bid_qty << " | AskQty: " << data.ask_qty << std::endl;

            // 3. Emit Signal if generated
            if (signal.type != SignalType::NONE) {
                std::string side = (signal.type == SignalType::BUY) ? "BUY" : "SELL";
                std::cout << ">>> [STRATEGY SIGNAL] " << side << " " << signal.symbol 
                          << " @ " << signal.price << " [TS: " << signal.timestamp << "]" << std::endl;
            }
        });
        
        // Start pipeline (connects to exchanges)
        pipeline.start();
        
        // Subscribe to Jupiter perpetuals symbols
        std::vector<std::string> symbols = {
            "SOL-PERP",
            "BTC-PERP", 
            "ETH-PERP",
        };
        pipeline.subscribe_all(symbols);
        
        std::cout << "[MAIN] HFT System Active. Strategy: Imbalance" << std::endl;
        
        // Keep main thread alive
        while (running) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        std::cout << "[MAIN] Shutting down..." << std::endl;
        pipeline.stop();
        
    } catch (const std::exception& e) {
        std::cerr << "[MAIN] Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}