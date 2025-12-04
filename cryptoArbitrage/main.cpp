//#include <QGuiApplication>
//#include <QQmlApplicationEngine>
//#include <QQmlContext>
#include <QWebSocket>
#include <QTimer>
#include <QDebug>
#include <QCoreApplication>
#include <csignal>
//#include <iostream>
#include <atomic>
//#include <thread>
//#include <chrono>
//#include <cstdio>
#include "dataPipeline.h"
//#include <iomanip>
#include <vector>
#include <string>
#define MAX_EXCHANGES 10

std::vector<double> g_exchangePrices;
std::vector<const char*> g_exchangeNames;
std::atomic<double> g_binancePrice{0.0};
std::atomic<double> g_coinbasePrice{0.0};
std::atomic<uint64_t> g_tradeCount{0};
std::atomic<bool> g_running{true};


DataPipeline* g_pipeline = nullptr;

// void displayThreadFunc() {
//     auto lastTime = std::chrono::high_resolution_clock::now();
//     uint64_t lastCount = 0;
    
//     printf("\033[2J\033[1;1H");
//     printf("Crypto Arbitrage Monitor\n");
    
//     while (g_running) {
//         auto now = std::chrono::high_resolution_clock::now();
//         auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - lastTime).count();
        
//         if (elapsed >= 10) {  
//             uint64_t currentCount = g_tradeCount.load();
//             uint64_t tps = (elapsed > 0) ? (currentCount - lastCount) * 1000 / elapsed : 0;
            
//             printf("\033[3;1H\033[2K");
//             printf("Binance: %.2f | Coinbase: %.2f | TPS: %llu | Total: %llu",
//        g_binancePrice.load(), g_coinbasePrice.load(),
//        (unsigned long long)tps,
//        (unsigned long long)currentCount);

//             fflush(stdout);
            
//             lastTime = now;
//             lastCount = currentCount;
//         }
        
//         std::this_thread::sleep_for(std::chrono::milliseconds(1));
//     }
// }

void signalHandler(int signal) {
    g_running = false;
}

void printAllPrices()
{
    QString out = "[";

    for (size_t i = 0; i < g_exchangeNames.size(); ++i) 
    {
        std::atomic_ref<double> ref(g_exchangePrices[i]);
        double val = ref.load(std::memory_order_relaxed);

        out += QString(g_exchangeNames[i]) + ": " + QString::number(val);

        if (i + 1 < g_exchangeNames.size())
            out += " | ";
    }

    out += "]";
    qDebug() << out;

}



int main(int argc, char *argv[])
{
        QCoreApplication app(argc, argv);
        signal(SIGINT, signalHandler);
        signal(SIGTERM, signalHandler);
        
        qRegisterMetaType<BinaryTrade>("BinaryTrade");
        qRegisterMetaType<unsigned char>("uint8_t");
        qRegisterMetaType<QByteArray>("QByteArray");
        
        DataPipeline pipeline;
        g_pipeline = &pipeline;

        for (size_t i = 0; i < MAX_EXCHANGES; i++) {
            const char* name = pipeline.getExchangeName(i);
            if (name) {
                qDebug() << "Enabled exchange:" << name;
                g_exchangeNames.push_back(name);
                g_exchangePrices.push_back(0.0);
            }
        }

        
        QObject::connect(&pipeline,&DataPipeline::priceReceived,[](qint64 priceTicks, uint8_t exchangeId, qint64 /*ts*/) 
        {
        double price = priceTicks / 100000.0;
        std::atomic_ref<double> ref(g_exchangePrices[exchangeId]);
        ref.store(price, std::memory_order_relaxed);
        g_tradeCount++;
        qDebug().noquote() << "Price received:" << g_exchangeNames[exchangeId] << price << Qt::flush;
        });

        
        QTimer::singleShot(100, [&pipeline]() {
            pipeline.connectToAllExchanges();
        });

        QTimer exitTimer;
        exitTimer.setInterval(50);
        QObject::connect(&exitTimer, &QTimer::timeout, [&]() {
        if (!g_running) {
        if (g_pipeline) {
            g_pipeline->disconnectFromAllExchanges();
        }
        app.quit();
    }
});
exitTimer.start();

        QTimer pricePrinter;
        pricePrinter.setInterval(1);  
        QObject::connect(&pricePrinter, &QTimer::timeout, []() {
            printAllPrices();
        });
        pricePrinter.start();
        return app.exec();
} 
