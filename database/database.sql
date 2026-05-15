CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    exchange_buy TEXT,
    exchange_sell TEXT,
    buy_price NUMERIC,
    sell_price NUMERIC,
    profit NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);