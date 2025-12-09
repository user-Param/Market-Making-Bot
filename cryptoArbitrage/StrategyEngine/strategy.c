#include "strategy.h"
#include <stdio.h>
#include <string.h>

void strategy_init(Strategy* s, MarketData* markets, int count, double threshold, double feeRate)
{
    s->minSpread = threshold;
    s->feeRate = feeRate;
    s->position = 0;

    for (int i = 0; i < count; ++i) {
        markets[i].initialized = false;
        markets[i].lowPrice = 0;
        markets[i].highPrice = 0;
        markets[i].currentSpread = 0;
    }
}

void update_market(MarketData* m, double price)
{
    if (!m->initialized) {
        m->lowPrice = price;
        m->highPrice = price;
        m->initialized = true;
    } else {
        if (price < m->lowPrice) m->lowPrice = price;
        if (price > m->highPrice) m->highPrice = price;
    }
}

static void insert_top(Opportunity top[], int *k, Opportunity op)
{
    int idx = -1;
    for (int i = 0; i < *k; ++i) if (top[i].spread < op.spread) { idx = i; break; }
    if (idx == -1) {
        if (*k < TOP_K_OPPS) top[(*k)++] = op;
        return;
    }
    int limit = (*k < TOP_K_OPPS) ? (*k)++ : TOP_K_OPPS;
    for (int j = limit - 1; j > idx; --j) top[j] = top[j-1];
    top[idx] = op;
}

void strategy_on_tick(Strategy* s, MarketData* markets, int count)
{
    if (count < 2) return;

    printf("=== Strategy Tick ===\n");
    for (int i = 0; i < count; ++i) {
        if (markets[i].initialized) {
            printf("Exchange %d: low=%.2f, high=%.2f\n", 
                   i, markets[i].lowPrice, markets[i].highPrice);
        }
    }

    Opportunity top[TOP_K_OPPS];
    int k = 0;
    for (int i = 0; i < count; ++i) {
        if (!markets[i].initialized) continue;
        for (int j = 0; j < count; ++j) {
            if (i==j || !markets[j].initialized) continue;
            double buy = markets[i].lowPrice;
            double sell = markets[j].highPrice;
            double net = sell * (1.0 - s->feeRate) - buy * (1.0 + s->feeRate);
            double spread = net;

            printf("Check: BUY@%d(%.2f) SELL@%d(%.2f) => net=%.4f (threshold=%.4f)\n",
                   i, buy, j, sell, spread, s->minSpread);

            if (spread > s->minSpread) {
                Opportunity op = {.buyIdx = i, .sellIdx = j, .spread = spread};
                insert_top(top, &k, op);
            }
        }
    }

    if (k == 0) {
        printf("No opportunities found (threshold too high?)\n");
        return;
    }
    for (int i = 0; i < k; ++i) {
        Opportunity *o = &top[i];
        printf("[OPP %d] BUY idx=%d (low=%.5f)  SELL idx=%d (high=%.5f)  NET_SPREAD=%.5f\n",
               i+1, o->buyIdx, markets[o->buyIdx].lowPrice, 
               o->sellIdx, markets[o->sellIdx].highPrice, o->spread);
    }
    printf("========================\n");
    fflush(stdout); 
}

// Add this function to strategy.c
void strategy_calculate_spread(Strategy* s, MarketData* markets, int buyIdx, int sellIdx, 
                               double* spread, double* percentage)
{
    if (buyIdx < 0 || sellIdx < 0 || !markets[buyIdx].initialized || !markets[sellIdx].initialized) {
        *spread = 0.0;
        *percentage = 0.0;
        return;
    }
    
    double buyPrice = markets[buyIdx].lowPrice;
    double sellPrice = markets[sellIdx].highPrice;
    
    // Calculate net profit after fees
    double buyCost = buyPrice * (1.0 + s->feeRate);
    double sellRevenue = sellPrice * (1.0 - s->feeRate);
    *spread = sellRevenue - buyCost;
    
    // Calculate percentage profit
    *percentage = (*spread / buyCost) * 100.0;
}

// Modify strategy_on_tick to use percentage threshold
void strategy_on_tick_percentage(Strategy* s, MarketData* markets, int count, double minPercentage)
{
    if (count < 2) return;
    
    Opportunity top[TOP_K_OPPS];
    int k = 0;
    
    for (int i = 0; i < count; ++i) {
        if (!markets[i].initialized) continue;
        for (int j = 0; j < count; ++j) {
            if (i==j || !markets[j].initialized) continue;
            
            double spread, percentage;
            strategy_calculate_spread(s, markets, i, j, &spread, &percentage);
            
            // Use percentage threshold instead of absolute
            if (percentage > minPercentage && spread > s->minSpread) {
                Opportunity op = {.buyIdx = i, .sellIdx = j, .spread = spread};
                insert_top(top, &k, op);
            }
        }
    }

    if (k == 0) return;
    
    printf("=== TOP %d OPPORTUNITIES ===\n", k);
    for (int i = 0; i < k; ++i) {
        Opportunity *o = &top[i];
        double spread, percentage;
        strategy_calculate_spread(s, markets, o->buyIdx, o->sellIdx, &spread, &percentage);
        
        printf("[%d] BUY: %s (%.2f) -> SELL: %s (%.2f) | Profit: $%.2f (%.4f%%)\n",
               i+1,
               "ExchangeNameHere", markets[o->buyIdx].lowPrice,  // You'll need to pass exchange names
               "ExchangeNameHere", markets[o->sellIdx].highPrice,
               spread, percentage);
    }
    printf("===========================\n");
    fflush(stdout);
}