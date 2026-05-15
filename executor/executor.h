#pragma once

#include <memory>
#include "../strategy/ImbalanceStrategy.h"
#include "../exchange/BaseExchange.h"

class Executor {
public:
    explicit Executor(std::shared_ptr<BaseExchange> exchange);
    ~Executor() = default;

    /**
     * Executes a trade based on a strategy signal.
     */
    void execute(const Signal& signal);

private:
    std::shared_ptr<BaseExchange> exchange_;
};