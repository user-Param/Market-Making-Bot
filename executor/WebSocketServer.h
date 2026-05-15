#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <cstdlib>
#include <functional>
#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include <mutex>
#include <memory>
#include <nlohmann/json.hpp>

namespace beast = boost::beast;         
namespace websocket = beast::websocket; 
namespace net = boost::asio;            
using tcp = boost::asio::ip::tcp;       

class WebSocketServer {
public:
    WebSocketServer(net::io_context& ioc, tcp::endpoint endpoint);
    void run();
    void broadcast(const nlohmann::json& msg);

private:
    void do_accept();
    void on_accept(beast::error_code ec, tcp::socket socket);

    net::io_context& ioc_;
    tcp::acceptor acceptor_;
    std::vector<std::shared_ptr<websocket::stream<beast::tcp_stream>>> sessions_;
    std::mutex sessions_mutex_;
};