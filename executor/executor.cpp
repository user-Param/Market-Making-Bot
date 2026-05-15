#include "executor.h"
#include <iostream>

Executor::Executor(std::shared_ptr<BaseExchange> exchange) : exchange_(exchange) {}

void Executor::execute(const Signal& signal) {
    if (signal.type == SignalType::NONE) return;

    Order order;
    order.symbol = signal.symbol;
    order.side = (signal.type == SignalType::BUY) ? OrderSide::BUY : OrderSide::SELL;
    order.type = OrderType::MARKET;
    order.price = signal.price;

    // Basic risk management: set quantity based on signal strength or a fixed limit
    // In a real system, this would come from a RiskManager class
    order.quantity = 0.1; // Using a small real quantity for safety
    order.client_order_id = "BOT_" + std::to_string(signal.timestamp);

    std::cout << "[EXECUTOR] Executing " << (order.side == OrderSide::BUY ? "BUY" : "SELL")
              << " " << order.quantity << " " << order.symbol
              << " @ " << order.price << " on " << exchange_->get_exchange_id() << std::endl;

    if (exchange_->place_order(order)) {
        std::cout << "[EXECUTOR] Order successfully executed" << std::endl;
    } else {
        std::cerr << "[EXECUTOR] Order execution failed" << std::endl;
    }
}