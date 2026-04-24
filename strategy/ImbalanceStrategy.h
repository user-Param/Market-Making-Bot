#pragma once

#include <string>
#include "../exchange/BaseExchange.h"
#include "../datapipeline/datapipeline.h"

/**
 * Signal Types for HFT Execution
 */
enum class SignalType {
    BUY,
    SELL,
    NONE
};

/**
 * Strategy Output Signal
 */
struct Signal {
    std::string symbol;
    SignalType type;
    double price;
    long long timestamp;
};

/**
 * ImbalanceStrategy - Microstructure Imbalance Logic
 * 
 * Computes the delta between bid and ask liquidity to predict
 * short-term price movements.
 */
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
