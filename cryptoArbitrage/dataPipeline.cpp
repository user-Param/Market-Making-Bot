#include "dataPipeline.h"
#include <QDebug>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSslError>
#include <zlib.h>

// QByteArray decompressGzip(const QByteArray &data)
// {
//     QByteArray decompressed;
//     z_stream strm = {0};
//     strm.avail_in = data.size();
//     strm.next_in = (Bytef *)data.data();

//     if (inflateInit2(&strm, 31) != Z_OK) {
//         return QByteArray();
//     }

//     while (true) {
//         char out[16384];
//         strm.avail_out = 16384;
//         strm.next_out = (Bytef *)out;

//         int ret = inflate(&strm, Z_NO_FLUSH);

//         if (ret == Z_STREAM_END) break;
//         if (ret != Z_OK) {
//             inflateEnd(&strm);
//             return QByteArray();
//         }
//         decompressed.append(out, 16384 - strm.avail_out);
//     }

//     inflateEnd(&strm);
//     return decompressed;
// }

DataPipeline::DataPipeline(QObject *parent) 
    : QObject(parent)               
    , m_socket(new QWebSocket)      
{
    // Connect basic signals in constructor
    connect(m_socket, &QWebSocket::connected, this, &DataPipeline::onConnected);
    connect(m_socket, &QWebSocket::disconnected, this, &DataPipeline::onDisconnected);
    connect(m_socket, &QWebSocket::errorOccurred,
        this, &DataPipeline::onError);
    connect(m_socket, QOverload<const QList<QSslError>&>::of(&QWebSocket::sslErrors),
            this, &DataPipeline::onSslErrors);
}

void DataPipeline::onConnected()
{
    qDebug() << "Connected to Binance";
    
    // Connect message handlers
    connect(m_socket, &QWebSocket::textMessageReceived,
            this, &DataPipeline::onTextMessageReceived);
    // connect(m_socket, &QWebSocket::binaryMessageReceived,
    //         this, &DataPipeline::onBinaryMessageReceived);
    
    emit connectionChanged(true);
}

void DataPipeline::onDisconnected()
{
    qDebug() << "WebSocket disconnected";
    emit connectionChanged(false);
}









void DataPipeline::onTextMessageReceived(QString message)
{
    QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    QJsonObject obj = doc.object();
    
    if (obj.contains("data")) {
        QJsonObject dataObj = obj["data"].toObject();
        
        if (dataObj["e"].toString() == "trade") {
            // Convert to binary-optimized structure
            BinaryTrade binaryTrade;
            
            // Copy symbol (fixed width)
            QString symbol = dataObj["s"].toString();
            strncpy(binaryTrade.symbol, symbol.toUtf8().constData(), 9);
            binaryTrade.symbol[9] = '\0';
            
            // Direct numeric conversion (no string parsing in business logic)
            binaryTrade.price = dataObj["p"].toString().toDouble();
            binaryTrade.quantity = dataObj["q"].toString().toDouble();
            binaryTrade.timestamp = dataObj["E"].toVariant().toLongLong();
            binaryTrade.isBuyerMaker = dataObj["m"].toBool();
            
            // Convert to QByteArray for emission
            QByteArray binaryData(reinterpret_cast<const char*>(&binaryTrade), sizeof(BinaryTrade));
            
            // 🎯 UPDATED: SHOW ACTUAL BINARY DATA
            qDebug() << "=== RAW BINARY DATA ===";
            qDebug() << "Binary size:" << binaryData.size() << "bytes";
            qDebug() << "Hex representation:" << binaryData.toHex();
            
            // Show individual field binary breakdown
            qDebug() << "Symbol bytes:" << QByteArray(binaryTrade.symbol, sizeof(binaryTrade.symbol)).toHex() 
                     << "->" << binaryTrade.symbol;
            qDebug() << "Price bytes:" << QByteArray(reinterpret_cast<const char*>(&binaryTrade.price), sizeof(binaryTrade.price)).toHex()
                     << "->" << binaryTrade.price;
            qDebug() << "Quantity bytes:" << QByteArray(reinterpret_cast<const char*>(&binaryTrade.quantity), sizeof(binaryTrade.quantity)).toHex()
                     << "->" << binaryTrade.quantity;
            qDebug() << "Timestamp bytes:" << QByteArray(reinterpret_cast<const char*>(&binaryTrade.timestamp), sizeof(binaryTrade.timestamp)).toHex()
                     << "->" << binaryTrade.timestamp;
            qDebug() << "Bool byte:" << QByteArray(reinterpret_cast<const char*>(&binaryTrade.isBuyerMaker), sizeof(binaryTrade.isBuyerMaker)).toHex()
                     << "->" << binaryTrade.isBuyerMaker;
            
            emit newDataReceived(binaryData);
        }
    }
}







void DataPipeline::onBinaryMessageReceived(QByteArray message)
{
   Q_UNUSED(message) 
}






void DataPipeline::onError(QAbstractSocket::SocketError error)
{
    qDebug() << "WebSocket error:" << error;
}

void DataPipeline::onSslErrors(const QList<QSslError> &errors)
{
    qDebug() << "SSL errors occurred, ignoring...";
    m_socket->ignoreSslErrors();
}

void DataPipeline::connectToExchange()
{
    // Use spot API - more reliable for testing
    m_socket->open(QUrl("wss://fstream.binance.com/stream?streams=btcusdt@trade"));
}

void DataPipeline::disconnect()
{
    m_socket->close();
}