#pragma once

#include <string>
#include "../exchange/BaseExchange.h"
#include "../datapipeline/datapipeline.h"


enum class SignalType {
    BUY,
    SELL,
    NONE
};

struct Signal {
    std::string symbol;
    SignalType type;
    double price;
    long long timestamp;
};

class ImbalanceStrategy {
public:
    ImbalanceStrategy() = default;
    ~ImbalanceStrategy() = default;

    /**
     * Entry point for market data updates.
     * Calculated in O(1) with no heap allocations.
     */
    Signal onMarketData(const MarketData& data);

private:
    // Threshold for signal generation
    static constexpr double THRESHOLD = 0.2;
};
