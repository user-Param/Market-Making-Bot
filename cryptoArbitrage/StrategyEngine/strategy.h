#ifndef STRATEGY_H
#define STRATEGY_H

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_EXCHANGES 20
#define TOP_K_OPPS 8

typedef struct {
    double lowPrice;
    double highPrice;
    double currentSpread;
    bool initialized;
} MarketData;

typedef struct {
    double minSpread;
    double feeRate;
    int position;
    double threshold;
    int exchangeCount;
} Strategy;

typedef struct {
    int buyIdx;
    int sellIdx;
    double spread;
} Opportunity;

void strategy_init(Strategy* s, MarketData* markets, int count, double threshold, double feeRate);
void update_market(MarketData* m, double price);
void strategy_on_tick(Strategy* s, MarketData* markets, int count);

#ifdef __cplusplus
}
#endif

#endif
