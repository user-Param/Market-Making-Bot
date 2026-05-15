#include "executor.h"
#include <iostream>

Executor::Executor(std::shared_ptr<BaseExchange> exchange) : exchange_(exchange) {}

void Executor::execute(const Signal& signal) {
    if (signal.type == SignalType::NONE) return;

    Order order;
    order.symbol = signal.symbol;
    order.side = (signal.type == SignalType::BUY) ? OrderSide::BUY : OrderSide::SELL;
    order.type = OrderType::MARKET; // Defaulting to market for skeleton
    order.price = signal.price;
    order.quantity = 1.0; // Skeleton quantity, should be calculated by risk manager
    order.client_order_id = "BOT_" + std::to_string(signal.timestamp);

    std::cout << "[EXECUTOR] Routing signal to " << exchange_->get_exchange_id() << std::endl;
    
    if (exchange_->place_order(order)) {
        std::cout << "[EXECUTOR] Order successfully routed" << std::endl;
    } else {
        std::cerr << "[EXECUTOR] Failed to route order" << std::endl;
    }
}