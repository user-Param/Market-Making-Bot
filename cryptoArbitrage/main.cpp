#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include "dataPipeline.h"

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);

    DataPipeline pipeline;
    pipeline.connectToExchange();

    QQmlApplicationEngine engine;
    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreationFailed,
        &app,
        []() { QCoreApplication::exit(-1); },
        Qt::QueuedConnection);
    engine.loadFromModule("cryptoArbitrage", "Main");

    return app.exec();
}
