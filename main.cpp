#include "exchange/BaseExchange.h"
#include "datapipeline/dataPipeline.h"
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
        // Create exchange instances
        auto jupiter = std::make_shared<Exchange1>();
        
        // Get pipeline instance
        auto& pipeline = DataPipeline::get_instance();
        
        // Register exchanges
        pipeline.register_exchange(jupiter);
        
        // Set custom data handler (optional)
        pipeline.set_data_handler([](const MarketData& data) {
            // Custom processing logic
            // This is where you connect to your trading system
            
            // Example: Log to database, send to strategy engine, etc.
            std::cout << "[CUSTOM] " 
                     << data.exchange_id << " " 
                     << data.symbol << " "
                     << data.price << " "
                     << data.bid << " " 
                     << data.ask << " "
                     << data.timestamp 
                     << std::endl;
        });
        
        // Start pipeline (connects to exchanges)
        pipeline.start();
        
        // Subscribe to Jupiter perpetuals symbols
        std::vector<std::string> symbols = {
            "SOL-PERP",
            "BTC-PERP", 
            "ETH-PERP",
            // Add more symbols as needed
        };
        pipeline.subscribe_all(symbols);
        
        std::cout << "[MAIN] System running. Press Ctrl+C to stop..." << std::endl;
        
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