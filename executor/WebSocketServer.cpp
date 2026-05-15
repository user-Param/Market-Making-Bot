#include "WebSocketServer.h"

WebSocketServer::WebSocketServer(net::io_context& ioc, tcp::endpoint endpoint)
    : ioc_(ioc), acceptor_(ioc.get_executor()) {
    beast::error_code ec;

    acceptor_.open(endpoint.protocol(), ec);
    acceptor_.set_option(net::socket_base::reuse_address(true), ec);
    acceptor_.bind(endpoint, ec);
    acceptor_.listen(net::socket_base::max_listen_connections, ec);
}

void WebSocketServer::run() {
    do_accept();
}

void WebSocketServer::broadcast(const nlohmann::json& msg) {
    std::string text = msg.dump();
    std::lock_guard<std::mutex> lock(sessions_mutex_);
    for (auto it = sessions_.begin(); it != sessions_.end();) {
        if (!(*it)->is_open()) {
            it = sessions_.erase(it);
        } else {
            try {
                (*it)->text(true);
                (*it)->write(net::buffer(text));
            } catch (...) {}
            ++it;
        }
    }
}

void WebSocketServer::do_accept() {
    acceptor_.async_accept(
        ioc_.get_executor(),
        beast::bind_front_handler(&WebSocketServer::on_accept, this));
}

void WebSocketServer::on_accept(beast::error_code ec, tcp::socket socket) {
    if (!ec) {
        auto session = std::make_shared<websocket::stream<beast::tcp_stream>>(std::move(socket));
        {
            std::lock_guard<std::mutex> lock(sessions_mutex_);
            sessions_.push_back(session);
        }
        session->async_accept(
            [session](beast::error_code ec) {
                if (ec) return;
                // For simplicity, we only broadcast, we don't read from clients much
            });
    }
    do_accept();
}