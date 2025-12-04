#include "dataPipeline.h"
#include <QDebug>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QSslError>
#include <QTimer>
#include <QJsonParseError>
#include <cstring>

DataPipeline::DataPipeline(QObject *parent)
    : QObject(parent)
{
    exchangeSockets.fill(nullptr);

    static constexpr ExchangeConfig EXCHANGE_CONFIGS[] = {
        {"binance", "wss://fstream.binance.com/stream?streams=btcusdt@trade", 0.001, 100, 0, true, false},
        {"coinbase", "wss://ws-feed.exchange.coinbase.com", 0.005, 200, 1, true, false},
    };

    const size_t configCount = sizeof(EXCHANGE_CONFIGS)/sizeof(EXCHANGE_CONFIGS[0]);
    const size_t copyCount = std::min(configCount, exchanges.size());

    for (size_t i = 0; i < copyCount; ++i) {
        exchanges[i] = EXCHANGE_CONFIGS[i];
        if (exchanges[i].enabled) enabledExchangeCount++;
    }
}

DataPipeline::~DataPipeline()
{
    disconnectFromAllExchanges();
}

void DataPipeline::connectToAllExchanges()
{
    for (uint8_t i = 0; i < exchanges.size(); ++i) {
        if (exchanges[i].enabled) connectToExchange(i);
    }
}

void DataPipeline::connectToExchange(uint8_t exchangeId)
{
    if (exchangeId >= exchanges.size() || !exchanges[exchangeId].enabled) return;
    if (exchangeSockets[exchangeId] != nullptr) return;

    QWebSocket* socket = new QWebSocket();
    exchangeSockets[exchangeId] = socket;

    connect(socket, &QWebSocket::connected, this,
            [this, exchangeId]() { handleExchangeConnected(exchangeId); },
            Qt::DirectConnection);

    connect(socket, &QWebSocket::disconnected, this,
            [this, exchangeId]() { handleExchangeDisconnected(exchangeId); },
            Qt::DirectConnection);

    connect(socket, &QWebSocket::textMessageReceived, this,
            [this, exchangeId](const QString& message) {
                handleExchangeTextMessage(exchangeId, message);
            },
            Qt::DirectConnection);

    connect(socket, &QWebSocket::binaryMessageReceived, this,
            [this, exchangeId](const QByteArray& message) {
                handleExchangeBinaryMessage(exchangeId, message);
            },
            Qt::DirectConnection);

    connect(socket, QOverload<const QList<QSslError>&>::of(&QWebSocket::sslErrors),
        [socket](const QList<QSslError>& errors){
            for (const auto &err : errors) {
                qWarning() << "SSL error on" << socket->requestUrl() << ":" << err.errorString();
            }
        });

    connect(socket, &QWebSocket::errorOccurred, [socket](QAbstractSocket::SocketError err){
    qWarning() << "WebSocket error on" << socket->requestUrl() << ":" << err;
        });



    socket->open(QUrl(QString::fromUtf8(exchanges[exchangeId].wsUrl)));
}

void DataPipeline::disconnectFromExchange(uint8_t exchangeId)
{
    if (exchangeId < exchangeSockets.size() && exchangeSockets[exchangeId]) {
        exchangeSockets[exchangeId]->close();
        exchangeSockets[exchangeId]->deleteLater();
        exchangeSockets[exchangeId] = nullptr;
    }
}

void DataPipeline::disconnectFromAllExchanges()
{
    for (uint8_t i = 0; i < exchangeSockets.size(); ++i) {
        if (exchangeSockets[i]) {
            exchangeSockets[i]->disconnect();
            exchangeSockets[i]->close();
            exchangeSockets[i]->deleteLater();
            exchangeSockets[i] = nullptr;
        }
    }
}

void DataPipeline::handleExchangeConnected(uint8_t exchangeId)
{
    QString name = QString::fromUtf8(exchanges[exchangeId].name);
    qDebug() << "Connected to exchange:" << name;
    QWebSocket* socket = exchangeSockets[exchangeId];
    if (name == "coinbase") {
        QJsonObject subscription;
        subscription["type"] = "subscribe";
        subscription["product_ids"] = QJsonArray::fromStringList({"BTC-USD"});
        subscription["channels"] = QJsonArray::fromStringList({"ticker"});
        QJsonDocument doc(subscription);
        socket->sendTextMessage(doc.toJson(QJsonDocument::Compact));
    }

    emit connectionChanged(name, true);
}

void DataPipeline::handleExchangeDisconnected(uint8_t exchangeId)
{
    QString name = QString::fromUtf8(exchanges[exchangeId].name);
    emit connectionChanged(name, false);
}

static inline qint64 priceToTicks(double price) {
    return static_cast<qint64>(price * 100000.0); 
}

void DataPipeline::handleExchangeTextMessage(uint8_t exchangeId, const QString& message)
{
    if (message.contains("\"type\":\"subscriptions\"") ||
        message.contains("\"type\":\"error\"")) {
        return;
    }

    QJsonParseError error;
    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8(), &error);
    if (error.error != QJsonParseError::NoError) return;

    double price = 0.0;
    bool gotPrice = false;

    if (exchangeId == 0) { 
        QJsonObject obj = doc.object();
        if (obj.contains("data")) {
            QJsonObject dataObj = obj["data"].toObject();
            if (dataObj["e"].toString() == "trade" && dataObj.contains("p")) {
                price = dataObj["p"].toString().toDouble();
                gotPrice = (price > 0.0);
            }
        }
    } else if (exchangeId == 1) { 
        QJsonObject obj = doc.object();
        if (obj["type"].toString() == "ticker" && obj.contains("price")) {
            price = obj["price"].toString().toDouble();
            gotPrice = (price > 0.0);
        }
    }

    if (gotPrice) {
        qint64 ticks = priceToTicks(price);
        qint64 ts = QDateTime::currentMSecsSinceEpoch();
        emit priceReceived(ticks, exchangeId, ts);
    }
}

void DataPipeline::handleExchangeBinaryMessage(uint8_t /*exchangeId*/, const QByteArray& /*message*/)
{
    
}

void DataPipeline::onWebSocketError(QAbstractSocket::SocketError /*error*/)
{
    
}
