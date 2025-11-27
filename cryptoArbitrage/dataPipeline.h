#ifndef DATAPIPELINE_H
#define DATAPIPELINE_H

#include <QObject>
#include <QWebSocket>
#include <QByteArray>
#include <QJsonDocument>    // ADD THIS
#include <QJsonObject>
#include <QString>

#pragma pack(push, 1)
struct BinaryTrade {
    char symbol[10];
    double price;
    double quantity;
    int64_t timestamp;
    bool isBuyerMaker;
};
#pragma pack(pop)


class DataPipeline : public QObject
{
    Q_OBJECT

public:
    explicit DataPipeline(QObject *parent = nullptr);
    void connectToExchange();
    void disconnect();

signals:
    void connectionChanged(bool connected);
    void newDataReceived(const QByteArray &data);

private slots:
    void onConnected();
    void onDisconnected();
    void onTextMessageReceived(QString message);
    void onBinaryMessageReceived(QByteArray message);
    void onError(QAbstractSocket::SocketError error);
    void onSslErrors(const QList<QSslError> &errors);

private:
    QWebSocket *m_socket;
};

QByteArray decompressGzip(const QByteArray &data);

#endif // DATAPIPELINE_H


