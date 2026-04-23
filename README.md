# Crypto Arbitrage High-Frequency Trading (HFT) Bot

A high-performance, multi-exchange cryptocurrency arbitrage bot designed for low-latency price monitoring and execution. Built with C++20 and C11, the system leverages Qt's robust networking capabilities and a custom C-based strategy engine to identify and track arbitrage opportunities across top global exchanges in real-time.

---

## 🚀 Overview

This bot is engineered for speed and scalability. It establishes simultaneous WebSocket connections to multiple cryptocurrency exchanges, ingesting tick-by-tick trade data and piping it into a specialized strategy engine. The engine calculates net profit spreads by accounting for exchange fees, slippage, and real-time price movements.

### Key Components
- **`DataPipeline` (C++):** A multi-threaded WebSocket manager that handles connections to Binance, Coinbase, Bybit, Kraken, and OKX. It parses incoming JSON/Binary trade data into standardized internal formats.
- **`StrategyEngine` (C):** A lightweight, ultra-low-latency core that monitors market depth and calculates the "Top-K" arbitrage opportunities across all exchange pairs.
- **`Main Orchestrator` (C++):** Bridges the data flow between the networking layer and the strategy engine using an efficient event-driven architecture.

---

## 🛠 Technical Stack

- **Languages:** C++20 (Core Logic), C11 (Strategy Engine).
- **Framework:** [Qt 6.8+](https://www.qt.io/) (Core, Network, WebSockets).
- **Build System:** CMake 3.16+.
- **Optimization:** `-O3`, `-march=native`, `-funroll-loops`, `-ffast-math`.
- **Concurrency:** Lock-free atomic operations (`std::atomic`) for thread-safe price updates.

---

## ✨ Features

### 1. Multi-Exchange Connectivity
Native support for major exchanges with customized WebSocket handlers:
- **Binance:** USDT-Futures trade stream.
- **Coinbase:** BTC-USD ticker feed.
- **Bybit:** BTCUSDT linear public trades.
- **Kraken:** XBT/USDT ticker data.
- **OKX:** BTC-USDT trade channel.

### 2. Low-Latency Strategy Engine
- **Tick-by-Tick Analysis:** Updates market state on every received trade.
- **Data Structures:**
  - `MarketData`: Tracks `lowPrice`, `highPrice`, and `currentSpread` for each exchange with an `initialized` flag for safe cold-starts.
  - `Strategy`: Holds configuration for `minSpread` thresholds, `feeRate`, and current `position` state.
  - `Opportunity`: A lightweight struct capturing `buyIdx`, `sellIdx`, and the calculated `spread` for rapid sorting.
- **Fee-Aware Spreads:** Calculates net profit by factoring in configurable taker/maker fees per exchange.
- **Top-K Tracking:** Maintains a priority list of the most profitable arbitrage paths (Buy Low / Sell High).
- **Memory Efficient:** Uses packed structs (`#pragma pack(1)`) and atomic memory ordering to minimize cache misses and context switching.

### 3. Performance Monitoring
- **TPS (Trades Per Second):** Real-time monitoring of data throughput.
- **Micro-batching:** Designed to handle thousands of updates per second without blocking the event loop.
- **Status Diagnostics:** Console-based logging of connectivity, price updates, and identified opportunities.

---

## 📂 Project Structure

```text
.
├── main.cpp                # Entry point & signal handling
├── dataPipeline.cpp/h      # WebSocket managers & exchange configs
├── StrategyEngine/
│   ├── strategy.c/h        # Core arbitrage logic (C implementation)
├── vulkan/                 # [Planned] High-performance GPU visualization
├── Main.qml                # [Legacy] Prototype GUI layout
└── CMakeLists.txt          # Build configuration & optimization flags
```

---

## ⚙️ Configuration

Exchange configurations are managed in `dataPipeline.cpp`. Each exchange is defined by:
- **WS URL:** Secure WebSocket endpoint.
- **Fee Rate:** Default taker fee (e.g., `0.001` for 0.1%).
- **Rate Limit:** Millisecond-based throttling.
- **Binary Support:** Toggle for binary/JSON protocols.

---

## 🔨 Build Instructions

### Prerequisites
- **Qt 6.8+** (Modules: Core, Network, WebSockets)
- **CMake 3.16+**
- **ZLIB**
- **C++20/C11 compatible compiler** (GCC/Clang)

### Steps
1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Market-Making-Bot/cryptoArbitrage
   ```

2. **Generate build files:**
   ```bash
   mkdir build && cd build
   cmake .. -DCMAKE_BUILD_TYPE=Release
   ```

3. **Compile:**
   ```bash
   make -j$(nproc)
   ```

4. **Run:**
   ```bash
   ./appcryptoArbitrage
   ```

---

## 📈 Performance Benchmarks (Typical)
- **Processing Latency:** < 50 microseconds (Network-to-Strategy).
- **Max Throughput:** Tested up to 15,000+ trades per second on high-frequency channels.
- **Memory Usage:** Minimal footprint due to static allocation and pointer reuse.

---

## ⚠️ Disclaimer
This software is for educational and research purposes only. Trading cryptocurrencies involves significant risk. The authors are not responsible for any financial losses incurred through the use of this bot.

---

## 📜 License
[MIT License](LICENSE) - See LICENSE file for details.
