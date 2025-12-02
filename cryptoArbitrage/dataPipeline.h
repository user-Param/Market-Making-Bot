#ifndef DATAPIPELINE_H
#define DATAPIPELINE_H

#include <QObject>
#include <QWebSocket>
#include <QByteArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QString>
#include <array>
#include <cstdint>
#include <atomic>
#include <QVariantMap>
#include <QTimer>
#include <QMutex>
#include <QMap>
#include <vector>
#include <memory>
#include <iomanip>
#include <cstring>            // for memset, memcpy
#include <QAbstractSocket>    // for QAbstractSocket::SocketError

// Make MAX_EXCHANGES visible to the header
static constexpr size_t MAX_EXCHANGES = 10;

#pragma pack(push, 1)
struct BinaryTrade {
    char symbol[10];
    double price;
    double quantity;
    int64_t timestamp;
    bool isBuyerMaker;
    uint8_t exchangeId;

    BinaryTrade() {
        memset(symbol, 0, sizeof(symbol));
        price = 0.0;
        quantity = 0.0;
        timestamp = 0;
        isBuyerMaker = false;
        exchangeId = 0;
    }

    // Method to serialize to byte array
    QByteArray toByteArray() const {
        QByteArray data;
        data.resize(sizeof(BinaryTrade));
        memcpy(data.data(), this, sizeof(BinaryTrade));
        return data;
    }

    // Method to deserialize from byte array
    static BinaryTrade fromByteArray(const QByteArray& data) {
        BinaryTrade trade;
        if (data.size() == sizeof(BinaryTrade)) {
            memcpy(&trade, data.constData(), sizeof(BinaryTrade));
        }
        return trade;
    }
};
#pragma pack(pop)

struct ExchangeConfig {
    const char* name;
    const char* wsUrl;
    double feeRate;
    uint16_t rateLimitMs;
    uint8_t exchangeId;
    bool enabled;
    bool useBinaryProtocol;
};

struct PriceStats {
    double lastPrice = 0;
    double minPrice = 0;
    double maxPrice = 0;
    double lastQuantity = 0;
    int tradeCount = 0;
    double totalVolume = 0;
};

class DataPipeline : public QObject
{
    Q_OBJECT

public:
    explicit DataPipeline(QObject *parent = nullptr);
    ~DataPipeline();



    void initializeExchanges();
    void connectToAllExchanges();
    void disconnectFromAllExchanges();
    void connectToExchange(uint8_t exchangeId);
    void disconnectFromExchange(uint8_t exchangeId);

public slots:
    void startTimers();


signals:
    void connectionChanged(const QString& exchangeName, bool connected);
    void newDataReceived(const QString& exchangeName, const QByteArray &data);
    void exchangeError(const QString& exchangeName, const QString& error);
    void tradeDirect(const BinaryTrade &trade);
    void tradeDataReceived(const QVariantMap &tradeData);
    void tradeBinaryReceived(const QByteArray &binaryData);
    void tradeBinaryPointer(const BinaryTrade* trade);

private:
    QTimer wsTimer;
    QTimer processTimer;

private slots:
    void onWebSocketError(QAbstractSocket::SocketError error);

private:
    std::array<ExchangeConfig, MAX_EXCHANGES> exchanges;
    std::array<QWebSocket*, MAX_EXCHANGES> exchangeSockets;
    std::atomic<uint8_t> enabledExchangeCount{0};

    // Statistics
    QMap<QString, PriceStats> m_priceStats;
    QMap<QString, QList<double>> m_recentPrices;
    QMap<QString, qint64> m_connectionTimes;
    QMutex m_statsMutex;
    QTimer* m_statsTimer;

    // Arbitrage tracking
    QMap<QString, QMap<QString, double>> m_exchangePrices;
    QMap<QString, QMap<QString, qint64>> m_exchangeTimestamps;
    QMutex m_arbitrageMutex;
    QTimer* m_arbitrageTimer;

    // Trade storage
    QMap<QString, BinaryTrade> m_lastTrades;
    QMutex m_tradeMutex;
    int m_tradeCount = 0;

    void handleExchangeConnected(uint8_t exchangeId);
    void handleExchangeDisconnected(uint8_t exchangeId);
    void handleExchangeTextMessage(uint8_t exchangeId, const QString& message);
    void handleExchangeBinaryMessage(uint8_t exchangeId, const QByteArray& message);
    void handleExchangeError(uint8_t exchangeId, QAbstractSocket::SocketError error);

    // Parsing
    bool parseBinanceTrade(const QJsonDocument& doc, BinaryTrade& trade, uint8_t exchangeId);
    bool parseCoinbaseTrade(const QJsonDocument& doc, BinaryTrade& trade, uint8_t exchangeId);
    bool parseTradeBinary(const QByteArray& data, BinaryTrade& trade);

    inline void emitTradeDirect(const BinaryTrade& trade) {
        emit tradeDirect(trade);
    }

    void emitTradeAsVariantMap(const QString& exchangeName, const BinaryTrade& trade);

    // Binary processing methods
    QByteArray convertTradeToBinary(const BinaryTrade& trade);
    void processTradeBinary(const QByteArray& binaryData, uint8_t exchangeId);

    // Statistics
    void updateStatistics(const QString& exchange, const BinaryTrade& trade);
    void printStatistics();
    void storeTradeForArbitrage(const QString& exchange, const BinaryTrade& trade);
    void calculateArbitrage();
};

#endif // DATAPIPELINE_H
