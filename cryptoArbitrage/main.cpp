#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QTimer>
#include <QDebug>
#include <QCoreApplication>
#include <csignal>
#include <iostream>
#include <atomic>
#include <thread>
#include <chrono>
#include <cstdio>
#include "dataPipeline.h"
#include <iomanip>
#define MAX_EXCHANGES 10

// Global atomic variables for display (declare them at global scope)
std::atomic<double> g_binancePrice{0.0};
std::atomic<double> g_coinbasePrice{0.0};
std::atomic<uint64_t> g_tradeCount{0};
std::atomic<bool> g_running{true};
DataPipeline* g_pipeline = nullptr;

void displayThreadFunc() {
    auto lastTime = std::chrono::high_resolution_clock::now();
    uint64_t lastCount = 0;
    
    // Clear screen and setup
    printf("\033[2J\033[1;1H");
    printf("🚀 ULTRA-FAST Crypto Arbitrage Monitor\n");
    
    while (g_running) {
        auto now = std::chrono::high_resolution_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastTime).count();
        
        if (elapsed >= 10) {  // Update every 10ms (100 Hz)
            uint64_t currentCount = g_tradeCount.load();
            uint64_t tps = (elapsed > 0) ? (currentCount - lastCount) * 1000 / elapsed : 0;
            
            // Move to line 3 and clear
            printf("\033[3;1H\033[2K");
            printf("Binance: %.2f | Coinbase: %.2f | TPS: %llu | Total: %llu",
       g_binancePrice.load(), g_coinbasePrice.load(),
       (unsigned long long)tps,
       (unsigned long long)currentCount);

            fflush(stdout);
            
            lastTime = now;
            lastCount = currentCount;
        }
        
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
}

void signalHandler(int signal) {
    printf("\n\nShutting down...\n");
    g_running = false;
    if (g_pipeline) {
        g_pipeline->disconnectFromAllExchanges();
    }
    QCoreApplication::quit();
}

int main(int argc, char *argv[])
{
    bool consoleMode = false;
    for (int i = 1; i < argc; ++i) {
        if (QString(argv[i]) == "--console" || QString(argv[i]) == "-c") {
            consoleMode = true;
            break;
        }
    }
    
    if (consoleMode) {
        QCoreApplication app(argc, argv);
        signal(SIGINT, signalHandler);
        signal(SIGTERM, signalHandler);
        
        printf("🚀 Starting ULTRA-FAST Crypto Arbitrage Monitor...\n");
        
        // Register types
        qRegisterMetaType<BinaryTrade>("BinaryTrade");
        qRegisterMetaType<uint8_t>("uint8_t");
        qRegisterMetaType<QByteArray>("QByteArray");
        
        DataPipeline pipeline;
        g_pipeline = &pipeline;
        
        // Stop all timers for maximum speed
        
        
        // Connect to binary trades
    QObject::connect(
    &pipeline,
    &DataPipeline::tradeBinaryReceived,
    &pipeline,
    [](const QByteArray &data) {
        if (data.size() >= sizeof(BinaryTrade)) {

            const BinaryTrade* trade =
                reinterpret_cast<const BinaryTrade*>(data.constData());

            g_tradeCount++;

            if (trade->exchangeId == 0) {
                g_binancePrice.store(trade->price);
            } else if (trade->exchangeId == 1) {
                g_coinbasePrice.store(trade->price);
            }
        }
    }
);

        
        // Start display thread
        std::thread displayThread(displayThreadFunc);
        
        // Connect to exchanges
        QTimer::singleShot(100, [&pipeline]() {
            printf("🔗 Connecting to exchanges...\n");
            pipeline.connectToAllExchanges();
        });
        
        printf("\n📊 Running in ULTRA-FAST mode...\n");
        printf("Press Ctrl+C to exit\n\n");
        
        int result = app.exec();
        
        // Cleanup
        g_running = false;
        if (displayThread.joinable()) {
            displayThread.join();
        }
        
        printf("\nExiting.\n");
        return result;
    } else {
        // GUI Mode
        QGuiApplication app(argc, argv);
        signal(SIGINT, signalHandler);
        signal(SIGTERM, signalHandler);

        qRegisterMetaType<BinaryTrade>("BinaryTrade");
        qRegisterMetaType<uint8_t>("uint8_t");
        qRegisterMetaType<QVariantMap>("QVariantMap");
        qRegisterMetaType<QByteArray>("QByteArray");
        
        qDebug() << "🚀 Starting High Frequency Trading Application...";
        
        DataPipeline pipeline;
        g_pipeline = &pipeline;
        
        // Start timers for GUI mode
        
        
        QQmlApplicationEngine engine;
        engine.rootContext()->setContextProperty("dataPipeline", &pipeline);
        
        QTimer::singleShot(100, [&pipeline]() {
            qDebug() << "🔗 Connecting to exchanges...";
            pipeline.connectToAllExchanges();
        });
        
        engine.loadFromModule("cryptoArbitrage", "Main");
        
        if (engine.rootObjects().isEmpty()) {
            qDebug() << "❌ No QML root objects loaded!";
            return -1;
        }
        
        qDebug() << "✅ Application started successfully";
        qDebug() << "📊 Waiting for exchange data...";
        
        return app.exec();
    }
}