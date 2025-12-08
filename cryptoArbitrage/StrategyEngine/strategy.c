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
            if (spread > s->minSpread) {
                Opportunity op = {.buyIdx = i, .sellIdx = j, .spread = spread};
                insert_top(top, &k, op);
            }
        }
    }

    if (k == 0) return;
    for (int i = 0; i < k; ++i) {
        Opportunity *o = &top[i];
        printf("[OPP %d] BUY idx=%d (low=%.5f)  SELL idx=%d (high=%.5f)  NET_SPREAD=%.5f\n",
               i+1, o->buyIdx, markets[o->buyIdx].lowPrice, o->sellIdx, markets[o->sellIdx].highPrice, o->spread);
    }
    fflush(stdout); 
}

