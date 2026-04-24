#include "ImbalanceStrategy.h"

Signal ImbalanceStrategy::onMarketData(const MarketData& data) {
    // Zero allocation signal initialization
    Signal signal;
    signal.symbol = data.symbol;
    signal.price = data.price;
    signal.timestamp = data.timestamp;
    signal.type = SignalType::NONE;

    // Guard against division by zero if book is empty
    double total_liquidity = data.bid_qty + data.ask_qty;
    if (total_liquidity <= 0.0) {
        return signal;
    }

    // Compute Microstructure Imbalance
    // Range: [-1.0, 1.0]
    double imbalance = (data.bid_qty - data.ask_qty) / total_liquidity;

    // Logic Execution
    if (imbalance > THRESHOLD) {
        signal.type = SignalType::BUY;
    } else if (imbalance < -THRESHOLD) {
        signal.type = SignalType::SELL;
    }

    return signal;
}
