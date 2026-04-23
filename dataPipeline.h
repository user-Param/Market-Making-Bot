#ifndef DATAPIPELINE_H
#define DATAPIPELINE_H

#include <QObject>
#include <QWebSocket>
#include <QByteArray>
#include <QString>
#include <array>
#include <cstdint>
#include <atomic>
#include <QDateTime>
#include <QAbstractSocket>

static constexpr size_t MAX_EXCHANGES = 10;

#pragma pack(push,1)
struct BinaryTrade {
    int64_t priceTicks;   
    int64_t timestamp;    
    uint8_t exchangeId;
    BinaryTrade() { priceTicks = 0; timestamp = 0; exchangeId = 0; }
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

class DataPipeline : public QObject
{
    Q_OBJECT

public:
    explicit DataPipeline(QObject *parent = nullptr);
    ~DataPipeline();

    void connectToAllExchanges();
    void disconnectFromAllExchanges();
    void connectToExchange(uint8_t exchangeId);
    void disconnectFromExchange(uint8_t exchangeId);

public:
    const char* getExchangeName(uint8_t id) const {
        if (id < MAX_EXCHANGES && exchanges[id].enabled)
            return exchanges[id].name;
        return nullptr;
    }


signals:
    void connectionChanged(const QString& exchangeName, bool connected);
    void exchangeError(const QString& exchangeName, const QString& error);
    void priceReceived(qint64 priceTicks, uint8_t exchangeId, qint64 timestamp);


private slots:
    void onWebSocketError(QAbstractSocket::SocketError error);

private:
    std::array<ExchangeConfig, MAX_EXCHANGES> exchanges;
    std::array<QWebSocket*, MAX_EXCHANGES> exchangeSockets;
    std::atomic<uint8_t> enabledExchangeCount{0};

    void handleExchangeConnected(uint8_t exchangeId);
    void handleExchangeDisconnected(uint8_t exchangeId);
    void handleExchangeTextMessage(uint8_t exchangeId, const QString& message);
    void handleExchangeBinaryMessage(uint8_t exchangeId, const QByteArray& message);
};

#endif
