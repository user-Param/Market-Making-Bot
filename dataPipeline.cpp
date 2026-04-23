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
        {"bybit", "wss://stream.bybit.com/v5/public/linear", 0.001, 100, 2, true, false},
        {"kraken", "wss://ws.kraken.com/", 0.001, 100, 3, true, false},
        {"okx", "wss://ws.okx.com:8443/ws/v5/public", 0.001, 100, 4, true, false},
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

    else if (name == "bybit") {
        const QByteArray sub = R"({"op":"subscribe","args":["publicTrade.BTCUSDT"]})";
        socket->sendTextMessage(QString::fromUtf8(sub));
        qDebug() << "Sent Bybit subscribe:" << QString::fromUtf8(sub);
    }

    else if (name == "kraken") {
    QJsonObject sub;
    sub["event"] = "subscribe";
    sub["pair"] = QJsonArray{"XBT/USDT"};
    QJsonObject subscription;
    subscription["name"] = "ticker";  
    sub["subscription"] = subscription;

    socket->sendTextMessage(QJsonDocument(sub).toJson(QJsonDocument::Compact));
    qDebug() << "Sent Kraken subscribe:" << QJsonDocument(sub).toJson(QJsonDocument::Compact);
}



else if (name == "okx") {
    QJsonObject sub;
    sub["op"] = "subscribe";

    QJsonArray args;
    QJsonObject arg;
    arg["channel"] = "trades";
    arg["instId"] = "BTC-USDT";  
    args.append(arg);

    sub["args"] = args;

    socket->sendTextMessage(QJsonDocument(sub).toJson(QJsonDocument::Compact));
    qDebug() << "Sent OKX subscribe:" << QJsonDocument(sub).toJson(QJsonDocument::Compact);
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
    if (error.error != QJsonParseError::NoError) {
        qWarning() << "JSON parse error:" << error.errorString();
        return;
    }

    double price = 0.0;
    bool gotPrice = false;
    if (exchangeId == 3) {
    if (doc.isArray()) {
        QJsonArray arr = doc.array();
        if (arr.size() >= 2) {
            if (arr[1].isArray()) {
                QJsonArray trades = arr[1].toArray();
                if (!trades.isEmpty()) {
                    QJsonValue first = trades[0];
                    if (first.isArray()) {
                        QJsonArray tradeInfo = first.toArray();
                        QString priceStr = tradeInfo.size() > 0 ? tradeInfo[0].toString() : QString();
                        double px = priceStr.toDouble();
                        if (px > 0) { price = px; gotPrice = true; }
                    } else if (first.isObject()) {
                        QJsonObject t = first.toObject();
                        if (t.contains("price")) {
                            double px = t["price"].toDouble();
                            if (px > 0) { price = px; gotPrice = true; }
                        }
                    }
                }
            }
            else if (arr[1].isObject()) {
                QJsonObject tickObj = arr[1].toObject();
                if (tickObj.contains("c") && tickObj["c"].isArray()) {
                    QJsonArray c = tickObj["c"].toArray();
                    if (!c.isEmpty()) {
                        double px = c[0].toString().toDouble();
                        if (px > 0) { price = px; gotPrice = true; }
                    }
                }
                if (!gotPrice) {
                    if (tickObj.contains("p")) {
                        double px = tickObj["p"].toDouble();
                        if (px > 0) { price = px; gotPrice = true; }
                    } else if (tickObj.contains("last") || tickObj.contains("last_price")) {
                        double px = tickObj.contains("last") ? tickObj["last"].toDouble() : tickObj["last_price"].toDouble();
                        if (px > 0) { price = px; gotPrice = true; }
                    }
                }
            }
        }
    }
    
}
    else if (doc.isObject()) {
        QJsonObject obj = doc.object();

        if (exchangeId == 0) { 
            if (obj.contains("data")) {
                QJsonObject dataObj = obj["data"].toObject();
                if (dataObj["e"].toString() == "trade" && dataObj.contains("p")) {
                    price = dataObj["p"].toString().toDouble();
                    gotPrice = (price > 0.0);
                }
            }
        }
        else if (exchangeId == 1) { 
            if (obj["type"].toString() == "ticker" && obj.contains("price")) {
                price = obj["price"].toString().toDouble();
                gotPrice = (price > 0.0);
            }
        }
        else if (exchangeId == 2) { 
            if (obj.contains("data")) {
                QJsonValue dataVal = obj["data"];
                if (dataVal.isArray()) {
                    QJsonArray arr = dataVal.toArray();
                    if (!arr.isEmpty() && arr[0].isObject()) {
                        QJsonObject trade = arr[0].toObject();
                        QString priceStr;
                        if (trade.contains("p")) priceStr = trade["p"].toString();
                        else if (trade.contains("price")) priceStr = trade["price"].toString();
                        if (!priceStr.isEmpty()) {
                            double px = priceStr.toDouble();
                            if (px > 0) { price = px; gotPrice = true; }
                        }
                    }
                } else if (dataVal.isObject()) {
                    QJsonObject dobj = dataVal.toObject();
                    QString priceStr;
                    if (dobj.contains("p")) priceStr = dobj["p"].toString();
                    else if (dobj.contains("price")) priceStr = dobj["price"].toString();
                    else if (dobj.contains("last_price")) priceStr = dobj["last_price"].toString();
                    if (!priceStr.isEmpty()) {
                        double px = priceStr.toDouble();
                        if (px > 0) { price = px; gotPrice = true; }
                    }
                }
            }
            if (!gotPrice && obj.contains("tick") && obj["tick"].isObject()) {
                QJsonObject tick = obj["tick"].toObject();
                if (tick.contains("last_price")) {
                    double px = tick["last_price"].toDouble();
                    if (px > 0) { price = px; gotPrice = true; }
                } else if (tick.contains("close")) {
                    double px = tick["close"].toDouble();
                    if (px > 0) { price = px; gotPrice = true; }
                }
            }
        }
        else if (exchangeId == 4) { 
    if (obj.contains("data") && obj["data"].isArray()) {
        QJsonArray arr = obj["data"].toArray();
        if (!arr.isEmpty() && arr[0].isObject()) {
            QJsonObject trade = arr[0].toObject();

            if (trade.contains("px")) {
                double px = trade["px"].toString().toDouble();
                if (px > 0) { price = px; gotPrice = true; }
            }
        }
    }
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
