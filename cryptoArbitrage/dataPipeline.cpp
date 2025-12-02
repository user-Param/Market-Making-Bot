#include "dataPipeline.h"
#include <QDebug>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSslError>
#include <QDateTime>
#include <QTimer>
#include <QJsonParseError>
#include <cstring>
#include <QJsonArray>
#include <QDataStream>
#include <iomanip>

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
    
    m_statsTimer = new QTimer(this);
    connect(m_statsTimer, &QTimer::timeout, this, &DataPipeline::printStatistics);

    m_arbitrageTimer = new QTimer(this);
    connect(m_arbitrageTimer, &QTimer::timeout, this, &DataPipeline::calculateArbitrage);
}

void DataPipeline::startTimers() {
    if (m_statsTimer) m_statsTimer->start(5000);
    if (m_arbitrageTimer) m_arbitrageTimer->start(1000);
}

void DataPipeline::initializeExchanges() {}

void DataPipeline::connectToAllExchanges()
{
    for (uint8_t i = 0; i < exchanges.size(); ++i) {
        if (exchanges[i].enabled) {
            connectToExchange(i);
        }
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
            [](const QList<QSslError>& errors) {
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
            exchangeSockets[i]->close();
            exchangeSockets[i]->deleteLater();
            exchangeSockets[i] = nullptr;
        }
    }
}

void DataPipeline::handleExchangeConnected(uint8_t exchangeId)
{
    QString name = QString::fromUtf8(exchanges[exchangeId].name);
    m_connectionTimes[name] = QDateTime::currentMSecsSinceEpoch();
    
    qDebug() << "CONNECTED to" << name;
    QWebSocket* socket = exchangeSockets[exchangeId];
    
    if (name == "coinbase") {
        QJsonObject subscription;
        subscription["type"] = "subscribe";
        subscription["product_ids"] = QJsonArray::fromStringList({"BTC-USD"});
        subscription["channels"] = QJsonArray::fromStringList({"ticker"});
        
        QJsonDocument doc(subscription);
        socket->sendTextMessage(doc.toJson(QJsonDocument::Compact));
        qDebug() << "Sent subscription to Coinbase";
    }
    
    emit connectionChanged(name, true);
}

void DataPipeline::handleExchangeDisconnected(uint8_t exchangeId)
{
    QString name = QString::fromUtf8(exchanges[exchangeId].name);
    emit connectionChanged(name, false);
}

// ULTRA-OPTIMIZED handleExchangeTextMessage
void DataPipeline::handleExchangeTextMessage(uint8_t exchangeId, const QString& message)
{
    if (message.contains("\"type\":\"subscriptions\"") || 
        message.contains("\"type\":\"error\"")) {
        return;
    }
    
    BinaryTrade trade{};
    trade.exchangeId = exchangeId;
    bool validTrade = false;
    
    if (exchangeId == 0) {  // Binance
        QJsonParseError error;
        QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8(), &error);
        if (error.error == QJsonParseError::NoError) {
            QJsonObject obj = doc.object();
            if (obj.contains("data")) {
                QJsonObject dataObj = obj["data"].toObject();
                if (dataObj["e"].toString() == "trade") {
                    trade.price = dataObj["p"].toString().toDouble();
                    if (trade.price > 0) {
                        QString symbol = dataObj["s"].toString();
                        const int copyLen = qMin(symbol.length(), 9);
                        memcpy(trade.symbol, symbol.constData(), copyLen);
                        trade.symbol[copyLen] = '\0';
                        trade.quantity = dataObj["q"].toString().toDouble();
                        trade.timestamp = dataObj["E"].toVariant().toLongLong();
                        trade.isBuyerMaker = dataObj["m"].toBool();
                        validTrade = true;
                    }
                }
            }
        }
    } 
    else if (exchangeId == 1) {  // Coinbase
        if (message.contains("\"type\":\"ticker\"")) {
            QJsonParseError error;
            QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8(), &error);
            if (error.error == QJsonParseError::NoError) {
                QJsonObject obj = doc.object();
                if (obj["type"].toString() == "ticker") {
                    trade.price = obj["price"].toString().toDouble();
                    if (trade.price > 0) {
                        QString symbol = obj["product_id"].toString().remove("-");
                        const int copyLen = qMin(symbol.length(), 9);
                        memcpy(trade.symbol, symbol.constData(), copyLen);
                        trade.symbol[copyLen] = '\0';
                        trade.quantity = obj["last_size"].toString().toDouble();
                        trade.timestamp = QDateTime::currentMSecsSinceEpoch();
                        trade.isBuyerMaker = false;
                        validTrade = true;
                    }
                }
            }
        }
    }
    
    if (validTrade) {
        m_tradeCount++;
        QByteArray binaryData = convertTradeToBinary(trade);
        emit tradeBinaryReceived(binaryData);
    }
}

void DataPipeline::handleExchangeBinaryMessage(uint8_t exchangeId, const QByteArray& message)
{
    const QString& name = QString::fromUtf8(exchanges[exchangeId].name);
    static std::atomic<int> binaryMessageCount{0};
    int count = ++binaryMessageCount;
    
    if (count <= 5) {
        qDebug() << "Binary message" << count << "from" << name 
                 << "size:" << message.size() << "bytes";
    }
    
    if (exchanges[exchangeId].useBinaryProtocol) {
        BinaryTrade trade;
        if (parseTradeBinary(message, trade)) {
            trade.exchangeId = exchangeId;
            m_tradeCount++;
            m_lastTrades[name] = trade;
            updateStatistics(name, trade);
            QByteArray binaryData = convertTradeToBinary(trade);
            processTradeBinary(binaryData, exchangeId);
            emitTradeDirect(trade);
            emitTradeAsVariantMap(name, trade);
            emit tradeBinaryReceived(binaryData);
            storeTradeForArbitrage(name, trade);
        }
    }
}

bool DataPipeline::parseBinanceTrade(const QJsonDocument& doc, BinaryTrade& trade, uint8_t exchangeId)
{
    QJsonObject obj = doc.object();
    if (!obj.contains("data")) return false;
    QJsonObject dataObj = obj["data"].toObject();
    if (dataObj["e"].toString() != "trade") return false;
    QString symbol = dataObj["s"].toString();
    strncpy(trade.symbol, symbol.toUtf8().constData(), 9);
    trade.symbol[9] = '\0';
    trade.price = dataObj["p"].toString().toDouble();
    trade.quantity = dataObj["q"].toString().toDouble();
    trade.timestamp = dataObj["E"].toVariant().toLongLong();
    trade.isBuyerMaker = dataObj["m"].toBool();
    return true;
}

bool DataPipeline::parseCoinbaseTrade(const QJsonDocument& doc, BinaryTrade& trade, uint8_t exchangeId)
{
    QJsonObject obj = doc.object();
    if (obj["type"].toString() != "ticker") return false;
    QString symbol = obj["product_id"].toString().remove("-");
    strncpy(trade.symbol, symbol.toUtf8().constData(), 9);
    trade.symbol[9] = '\0';
    trade.price = obj["price"].toString().toDouble();
    trade.quantity = obj["last_size"].toString().toDouble();
    trade.timestamp = QDateTime::currentMSecsSinceEpoch();
    trade.isBuyerMaker = false;
    return true;
}

bool DataPipeline::parseTradeBinary(const QByteArray& data, BinaryTrade& trade)
{
    if (data.size() == sizeof(BinaryTrade)) {
        memcpy(&trade, data.constData(), sizeof(BinaryTrade));
        return true;
    }
    return false;
}

QByteArray DataPipeline::convertTradeToBinary(const BinaryTrade& trade)
{
    QByteArray binaryData(sizeof(BinaryTrade), 0);
    memcpy(binaryData.data(), &trade, sizeof(BinaryTrade));
    return binaryData;
}

void DataPipeline::processTradeBinary(const QByteArray& binaryData, uint8_t exchangeId)
{
    static std::vector<QByteArray> tradeBuffer;
    tradeBuffer.push_back(binaryData);
    if (tradeBuffer.size() >= 100) {
        tradeBuffer.clear();
    }
}

void DataPipeline::emitTradeAsVariantMap(const QString& exchangeName, const BinaryTrade& trade)
{
    QVariantMap tradeMap;
    tradeMap["exchange"] = exchangeName;
    tradeMap["symbol"] = QString(trade.symbol);
    tradeMap["price"] = trade.price;
    tradeMap["quantity"] = trade.quantity;
    tradeMap["timestamp"] = trade.timestamp;
    tradeMap["isBuyerMaker"] = trade.isBuyerMaker;
    emit tradeDataReceived(tradeMap);
}

void DataPipeline::handleExchangeError(uint8_t exchangeId, QAbstractSocket::SocketError error)
{
    QString name = QString::fromUtf8(exchanges[exchangeId].name);
    if (error != QAbstractSocket::RemoteHostClosedError) {
        qWarning() << "Exchange error:" << name << error;
    }
    emit exchangeError(name, QString("Socket error: %1").arg(error));
}

DataPipeline::~DataPipeline()
{
    disconnectFromAllExchanges();
    if (m_statsTimer) m_statsTimer->stop();
    if (m_arbitrageTimer) m_arbitrageTimer->stop();
}

void DataPipeline::onWebSocketError(QAbstractSocket::SocketError error)
{
    Q_UNUSED(error)
}

void DataPipeline::updateStatistics(const QString& exchange, const BinaryTrade& trade)
{
    QMutexLocker locker(&m_statsMutex);
    if (!m_priceStats.contains(exchange)) m_priceStats[exchange] = PriceStats();
    PriceStats& stats = m_priceStats[exchange];
    stats.lastPrice = trade.price;
    stats.lastQuantity = trade.quantity;
    stats.tradeCount++;
    stats.totalVolume += trade.quantity;
    if (trade.price < stats.minPrice || stats.minPrice == 0) stats.minPrice = trade.price;
    if (trade.price > stats.maxPrice) stats.maxPrice = trade.price;
    m_recentPrices[exchange].append(trade.price);
    while (m_recentPrices[exchange].size() > 100) m_recentPrices[exchange].removeFirst();
}

void DataPipeline::printStatistics()
{
    QMutexLocker locker(&m_statsMutex);
    qDebug() << "\n" << QString(50, '=');
    qDebug() << "EXCHANGE STATISTICS (Last 5 seconds)";
    qDebug() << QString(50, '-');
    for (const auto& exchange : m_priceStats.keys()) {
        const PriceStats& stats = m_priceStats[exchange];
        double movingAvg = 0;
        if (!m_recentPrices[exchange].isEmpty()) {
            for (double price : m_recentPrices[exchange]) movingAvg += price;
            movingAvg /= m_recentPrices[exchange].size();
        }
        double tradesPerSecond = stats.tradeCount / 5.0; // FIXED: divide by 5 seconds
        qDebug() << QString(" %1:").arg(exchange);
        qDebug() << QString("   Last Price: $%1").arg(stats.lastPrice, 0, 'f', 2);
        qDebug() << QString("   Min Price:  $%1").arg(stats.minPrice, 0, 'f', 2);
        qDebug() << QString("   Max Price:  $%1").arg(stats.maxPrice, 0, 'f', 2);
        qDebug() << QString("   Volume:     %1 BTC").arg(stats.totalVolume, 0, 'f', 3);
        qDebug() << QString("   Trades/sec: %1").arg(tradesPerSecond, 0, 'f', 1);
        qDebug() << QString("   Avg Price:  $%1").arg(movingAvg, 0, 'f', 2);
        m_priceStats[exchange].tradeCount = 0;
        m_priceStats[exchange].totalVolume = 0;
    }
    qDebug() << QString(50, '=') << "\n";
}

void DataPipeline::storeTradeForArbitrage(const QString& exchange, const BinaryTrade& trade)
{
    QMutexLocker locker(&m_arbitrageMutex);
    QString commonSymbol = QString(trade.symbol).toUpper();
    m_exchangePrices[exchange][commonSymbol] = trade.price;
    m_exchangeTimestamps[exchange][commonSymbol] = trade.timestamp;
}

void DataPipeline::calculateArbitrage()
{
    QMutexLocker locker(&m_arbitrageMutex);
    if (m_exchangePrices.contains("binance") && m_exchangePrices.contains("coinbase")) {
        QString symbol = "BTCUSDT";
        double binancePrice = m_exchangePrices["binance"].value(symbol, 0);
        double coinbasePrice = m_exchangePrices["coinbase"].value(symbol, 0);
        qint64 binanceTime = m_exchangeTimestamps["binance"].value(symbol, 0);
        qint64 coinbaseTime = m_exchangeTimestamps["coinbase"].value(symbol, 0);
        if (binancePrice > 0 && coinbasePrice > 0) {
            double priceDiff = coinbasePrice - binancePrice;
            double priceDiffPercent = (priceDiff / binancePrice) * 100;
            qint64 timeDiff = qAbs(coinbaseTime - binanceTime);
            if (qAbs(priceDiffPercent) > 0.01) {
                QString direction = priceDiff > 0 ? "Coinbase > Binance" : "Binance > Coinbase";
                qDebug() << "\nARBITRAGE OPPORTUNITY DETECTED!";
                qDebug() << QString("   %1: %2%").arg(direction).arg(qAbs(priceDiffPercent), 0, 'f', 4);
                qDebug() << QString("   Binance:  $%1").arg(binancePrice, 0, 'f', 2);
                qDebug() << QString("   Coinbase: $%1").arg(coinbasePrice, 0, 'f', 2);
                qDebug() << QString("   Difference: $%1").arg(qAbs(priceDiff), 0, 'f', 2);
                qDebug() << QString("   Time lag: %1 ms").arg(timeDiff);
                double tradeSize = 0.01;
                double potentialProfit = qAbs(priceDiff) * tradeSize;
                double fees = tradeSize * binancePrice * 0.001 + tradeSize * coinbasePrice * 0.005;
                if (potentialProfit > fees) {
                    qDebug() << QString("   Profitable! Net: $%1").arg(potentialProfit - fees, 0, 'f', 2);
                } else {
                    qDebug() << QString("   Not profitable after fees");
                }
                qDebug() << "";
            }
        }
    }
}
