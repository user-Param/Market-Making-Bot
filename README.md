<div align="center">

<br/>

```
 ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗      █████╗ ██████╗ ██████╗ 
██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗    ██╔══██╗██╔══██╗██╔══██╗
██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║    ███████║██████╔╝██████╔╝
██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║    ██╔══██║██╔══██╗██╔══██╗
╚██████╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝    ██║  ██║██║  ██║██████╔╝
 ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
```

### Ultra-Low Latency · Multi-Exchange · Fee-Aware · Real-Time

<br/>

[![Language](https://img.shields.io/badge/C%2B%2B-20-00599C?style=flat-square&logo=cplusplus&logoColor=white)](https://en.cppreference.com/w/cpp/20)
[![Language](https://img.shields.io/badge/C-11-A8B9CC?style=flat-square&logo=c&logoColor=black)](https://en.cppreference.com/w/c/11)
[![Framework](https://img.shields.io/badge/Qt-6.8+-41CD52?style=flat-square&logo=qt&logoColor=white)](https://www.qt.io/)
[![Build](https://img.shields.io/badge/CMake-3.16+-064F8C?style=flat-square&logo=cmake&logoColor=white)](https://cmake.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)]()

<br/>

> A high-performance, multi-exchange cryptocurrency arbitrage system built for sub-50μs latency.  
> Simultaneous WebSocket feeds, a C-core strategy engine, and Top-K opportunity tracking — all without blocking the event loop.

<br/>

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Technical Stack](#️-technical-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Configuration](#️-configuration)
- [Build Instructions](#-build-instructions)
- [Performance Benchmarks](#-performance-benchmarks)
- [Roadmap](#-roadmap)
- [Disclaimer](#️-disclaimer)
- [License](#-license)

---

## 🔍 Overview

**CryptoArb** is engineered for speed and scalability at the infrastructure level. It establishes simultaneous WebSocket connections to multiple tier-1 cryptocurrency exchanges, ingesting tick-by-tick trade data and piping it through a specialized, lock-free strategy engine.

The engine calculates **net profit spreads** in real-time by accounting for:

- Taker/maker **fee rates** per exchange
- **Slippage** estimates
- **Live price movements** across all monitored pairs

The result is a continuously updated priority list of the most actionable arbitrage opportunities, ranked by net profit potential, with diagnostics and throughput monitoring built in.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MARKET DATA LAYER                            │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌───────┐  │
│  │ Binance  │  │ Coinbase │  │  Bybit   │  │ Kraken │  │  OKX  │  │
│  │  (WSS)   │  │  (WSS)   │  │  (WSS)   │  │ (WSS)  │  │ (WSS) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  └───┬───┘  │
└───────┼─────────────┼─────────────┼─────────────┼───────────┼──────┘
        │             │             │             │           │
        └─────────────┴─────────────┴──────┬──────┘           │
                                           │  ◄───────────────┘
                                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     DataPipeline (C++20)                             │
│                                                                      │
│   Multi-threaded WebSocket Manager · JSON/Binary Parser              │
│   Standardized Internal Format · std::atomic price updates          │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │  Event-Driven Bridge
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    StrategyEngine (C11)                              │
│                                                                      │
│   MarketData[] · Fee-Aware Spread Calc · Top-K Opportunity Heap     │
│   Lock-Free Atomics · #pragma pack(1) structs · < 50μs latency      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │     Console Output /   │
                    │   Strategy Decisions   │
                    └────────────────────────┘
```

### Core Components

| Component | Language | Responsibility |
|---|---|---|
| `DataPipeline` | C++20 | Multi-threaded WebSocket manager; parses JSON/Binary trade data into standardized structs |
| `StrategyEngine` | C11 | Ultra-low-latency arbitrage core; maintains market depth and computes Top-K opportunities |
| `Main Orchestrator` | C++20 | Event-driven bridge between the networking layer and strategy engine |

---

## 🛠️ Technical Stack

| Category | Technology |
|---|---|
| **Languages** | C++20 (Core Logic), C11 (Strategy Engine) |
| **Framework** | Qt 6.8+ — Core, Network, WebSockets |
| **Build System** | CMake 3.16+ |
| **Concurrency** | `std::atomic` — lock-free, cache-friendly price updates |
| **Compiler Flags** | `-O3` `-march=native` `-funroll-loops` `-ffast-math` |
| **Memory Model** | Static allocation, packed structs, pointer reuse |
| **Protocol** | Secure WebSocket (WSS) — JSON and Binary |

---

## ✨ Features

### 1. Multi-Exchange Connectivity

Native WebSocket handlers with per-exchange fee and protocol configurations:

| Exchange | Feed | Asset | Fee (Default) | Protocol |
|---|---|---|---|---|
| **Binance** | USDT-Futures trade stream | BTC/USDT | 0.1% | JSON |
| **Coinbase** | BTC-USD ticker feed | BTC/USD | 0.1% | JSON |
| **Bybit** | Linear public trades | BTCUSDT | 0.1% | JSON |
| **Kraken** | Ticker data | XBT/USDT | 0.1% | JSON |
| **OKX** | Trade channel | BTC-USDT | 0.1% | Binary |

### 2. Low-Latency Strategy Engine

The C11 core is designed around minimal allocations and maximum throughput:

**Data Structures**

```c
// MarketData — per-exchange price tracking
typedef struct {
    float lowPrice;
    float highPrice;
    float currentSpread;
    bool  initialized;   // safe cold-start guard
} MarketData;

// Strategy — runtime configuration
typedef struct {
    float minSpread;     // minimum profitable threshold
    float feeRate;       // taker fee per exchange
    int   position;      // current position state
} Strategy;

// Opportunity — lightweight ranking struct
typedef struct {
    int   buyIdx;
    int   sellIdx;
    float spread;        // net profit after fees
} Opportunity;
```

**Engine Capabilities**

- **Tick-by-tick analysis** — market state updated on every received trade
- **Fee-aware spread calculation** — net profit = gross spread − (buy fee + sell fee)
- **Top-K tracking** — priority-sorted list of the most profitable arbitrage paths
- **Atomic memory ordering** — thread-safe price updates without mutex overhead
- **Packed structs** (`#pragma pack(1)`) — minimized cache misses and struct padding

### 3. Performance Monitoring

- **TPS (Trades Per Second)** — real-time data throughput counter
- **Micro-batching** — handles 15,000+ updates/sec without blocking the Qt event loop
- **Status diagnostics** — console logging for connectivity, price events, and opportunities

---

## 📂 Project Structure

```
Market-Making-Bot/
│
├── main.cpp                    # Entry point, signal handling, orchestrator init
├── dataPipeline.cpp            # WebSocket managers & exchange configs
├── dataPipeline.h              # DataPipeline interface
│
├── StrategyEngine/
│   ├── strategy.c              # Core arbitrage logic (C11)
│   └── strategy.h              # Engine API — init, update, query
│
├── vulkan/                     # [Planned] GPU-accelerated visualization layer
├── Main.qml                    # [Legacy] Prototype GUI layout
└── CMakeLists.txt              # Build config & optimization flags
```

---

## ⚙️ Configuration

Exchange configurations live in `dataPipeline.cpp`. Each exchange is defined by a config struct:

```cpp
struct ExchangeConfig {
    QString  name;          // Display name
    QString  wsUrl;         // Secure WebSocket endpoint
    QString  subscribeMsg;  // Subscription payload (JSON)
    double   feeRate;       // Default taker fee (e.g. 0.001 = 0.1%)
    int      rateLimit;     // Throttle in milliseconds
    bool     binarySupport; // Toggle JSON vs binary protocol
};
```

To add a new exchange:
1. Define a new `ExchangeConfig` entry in `dataPipeline.cpp`
2. Implement the exchange-specific JSON/binary parser
3. Register the feed in the `DataPipeline` constructor
4. The strategy engine automatically picks up the new data source

---

## 🔨 Build Instructions

### Prerequisites

Ensure the following are installed on your system:

| Dependency | Version | Notes |
|---|---|---|
| Qt | 6.8+ | Modules: Core, Network, WebSockets |
| CMake | 3.16+ | Build system |
| ZLIB | Any | Required by Qt Network |
| GCC / Clang | C++20 / C11 | `g++ 11+` or `clang 13+` recommended |

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/user-Param/Market-Making-Bot.git
cd Market-Making-Bot
```

**2. Generate build files**
```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
```

**3. Compile**
```bash
make -j$(nproc)
```

**4. Run**
```bash
./appcryptoArbitrage
```

> **macOS note:** If Qt is installed via Homebrew, you may need to pass:  
> `cmake .. -DCMAKE_PREFIX_PATH=$(brew --prefix qt)`

---

## 📈 Performance Benchmarks

Measured on Apple Silicon (M-series) and x86-64 Linux under real market conditions:

| Metric | Result |
|---|---|
| **Network-to-Strategy Latency** | < 50 microseconds |
| **Max Throughput** | 15,000+ trades/second |
| **Memory Footprint** | Minimal — static allocation, pointer reuse |
| **CPU Usage (5 exchanges)** | < 5% on a single core |
| **Uptime Stability** | Multi-hour sessions without memory growth |

---

## 🗺 Roadmap

- [ ] **Vulkan visualization layer** — GPU-rendered real-time opportunity dashboard
- [ ] **FPGA integration hooks** — hardware-accelerated order routing
- [ ] **Live order execution** — risk-gated direct exchange API integration
- [ ] **Historical replay** — backtesting against tick-level datasets
- [ ] **gRPC telemetry** — remote monitoring and strategy control
- [ ] **Docker deployment** — containerized multi-instance setup

---

## ⚠️ Disclaimer

This software is intended for **educational and research purposes only**. Cryptocurrency trading involves significant financial risk. Past performance of any strategy does not guarantee future results. The authors and contributors are **not responsible for any financial losses** incurred through the use of this software.

Always paper-trade and validate thoroughly before deploying real capital.

---

## 📜 License

Distributed under the [MIT License](LICENSE). See `LICENSE` for full details.

---

<div align="center">

Built with C++20 · C11 · Qt 6 · CMake

*If this project helped you, consider leaving a ⭐ on GitHub.*

</div>