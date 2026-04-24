#include "dataPipeline.h"
#include <iostream>
#include <chrono>

DataPipeline::~DataPipeline() {
    stop();
}

void DataPipeline::register_exchange(std::shared_ptr<BaseExchange> exchange) {
    std::lock_guard<std::mutex> lock(exchanges_mutex_);
    
    // Set callback to route data through pipeline
    exchange->set_callback([this](const MarketData& data) {
        process_market_data(data);
    });
    
    exchanges_.push_back(exchange);
    
    std::cout << "[PIPELINE] Registered exchange: " << exchange->get_exchange_id() << std::endl;
}

void DataPipeline::start() {
    if (running_) return;
    
    running_ = true;
    
    // Connect all exchanges
    {
        std::lock_guard<std::mutex> lock(exchanges_mutex_);
        for (auto& exchange : exchanges_) {
            exchange->connect();
        }
    }
    
    // Start pipeline processing thread
    pipeline_thread_ = std::thread(&DataPipeline::pipeline_loop, this);
    
    std::cout << "[PIPELINE] Data pipeline started" << std::endl;
}

void DataPipeline::stop() {
    running_ = false;
    data_available_.notify_all();
    
    if (pipeline_thread_.joinable()) {
        pipeline_thread_.join();
    }
    
    std::cout << "[PIPELINE] Data pipeline stopped" << std::endl;
}

void DataPipeline::subscribe_all(const std::vector<std::string>& symbols) {
    std::lock_guard<std::mutex> lock(exchanges_mutex_);
    
    for (auto& exchange : exchanges_) {
        exchange->subscribe(symbols);
    }
    
    std::cout << "[PIPELINE] Subscribed all exchanges to " << symbols.size() << " symbols" << std::endl;
}

void DataPipeline::set_data_handler(DataHandler handler) {
    data_handler_ = std::move(handler);
}

void DataPipeline::process_market_data(const MarketData& data) {
    std::lock_guard<std::mutex> lock(queue_mutex_);
    data_queue_.push(data);
    data_available_.notify_one();
}

void DataPipeline::pipeline_loop() {
    std::cout << "[PIPELINE] Processing loop started" << std::endl;
    
    while (running_) {
        std::unique_lock<std::mutex> lock(queue_mutex_);
        
        // Wait for data or stop signal
        data_available_.wait(lock, [this]() {
            return !data_queue_.empty() || !running_;
        });
        
        if (!running_) break;
        
        // Process all available data
        while (!data_queue_.empty()) {
            MarketData data = std::move(data_queue_.front());
            data_queue_.pop();
            lock.unlock();
            
            // Execute data handler if set
            if (data_handler_) {
                data_handler_(data);
            } else {
                // Default: Print data in standardized format
                std::cout << "[DATA] " 
                         << data.exchange_id << " | "
                         << data.symbol << " | "
                         << "P:" << data.price << " | "
                         << "B:" << data.bid << "(" << data.bid_qty << ") | "
                         << "A:" << data.ask << "(" << data.ask_qty << ") | "
                         << "T:" << data.timestamp
                         << std::endl;
            }
            
            lock.lock();
        }
    }
    
    std::cout << "[PIPELINE] Processing loop ended" << std::endl;
}