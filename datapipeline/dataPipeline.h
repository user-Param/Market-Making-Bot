#pragma once

#include "../exchange/BaseExchange.h"
#include <memory>
#include <unordered_map>
#include <mutex>
#include <queue>
#include <condition_variable>
#include <thread>
#include <functional>

// Data Pipeline - Central data feed manager
class DataPipeline {
public:
    using DataHandler = std::function<void(const MarketData&)>;
    
    static DataPipeline& get_instance() {
        static DataPipeline instance;
        return instance;
    }
    
    // Register an exchange with the pipeline
    void register_exchange(std::shared_ptr<BaseExchange> exchange);
    
    // Start the data pipeline
    void start();
    
    // Stop the data pipeline
    void stop();
    
    // Subscribe to symbols across all registered exchanges
    void subscribe_all(const std::vector<std::string>& symbols);
    
    // Set custom data handler
    void set_data_handler(DataHandler handler);

private:
    DataPipeline() = default;
    ~DataPipeline();
    
    DataPipeline(const DataPipeline&) = delete;
    DataPipeline& operator=(const DataPipeline&) = delete;
    
    // Process incoming market data
    void process_market_data(const MarketData& data);
    
    // Pipeline processing thread
    void pipeline_loop();
    
    std::vector<std::shared_ptr<BaseExchange>> exchanges_;
    std::queue<MarketData> data_queue_;
    std::mutex queue_mutex_;
    std::condition_variable data_available_;
    DataHandler data_handler_;
    
    std::thread pipeline_thread_;
    std::atomic<bool> running_{false};
    
    mutable std::mutex exchanges_mutex_;
};

// Additional Exchange implementations can be added here
// Example: Exchange2 (Binance), Exchange3 (Bybit), etc.