import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

ApplicationWindow {
    width: 1920
    height: 1080
    visible: true
    title: qsTr("High Frequency Trading")
    Column {
        anchors.fill: parent
        anchors.margins: 1
        Rectangle {
            width: parent.width
            height: parent.height * 0.05
            border.width: 1
            border.color: "black"
            color: "#f0f0f0"
            
            RowLayout {
                anchors.fill: parent
                anchors.margins: 10
                
                Text {
                    text: "Binance: " 
                    color: "black"
                }
                
                Text {
                    text: "Coinbase: "
                    color: "black"
                }
                
                Text {
                    text: "Trades: " 
                    color: "black"
                }
                
                Text {
                    text: "Last: "
                    color: "black"
                }
                
                Text {
                    text: "Latency: "
                    color: "black"
                }
            }
        }
        
        Rectangle {
            width: parent.width
            height: parent.height * 0.7
            color: "transparent"
            border.width: 1
            border.color: "black"
            
            Row {
                anchors.fill: parent
                anchors.margins: 1
                
                Rectangle {
                    height: parent.height
                    width: parent.width * 0.6
                    border.width: 1
                    border.color: "black"
                    
                    Column {
                        anchors.fill: parent
                        anchors.margins: 10
                        
                        Text {
                            text: "PRICE CHART"
                            font.pixelSize: 24
                            font.bold: true
                        }
                        
                        Rectangle {
                            width: parent.width
                            height: 2
                            color: "black"
                        }
                        
                        Text {
                            text: "Receiving real-time trades..."
                            font.pixelSize: 16
                            anchors.centerIn: parent
                            color: "green"
                        }
                        
                        Text {
                            text: "Total trades processed: " 
                            font.pixelSize: 14
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                    }
                }
                
                Rectangle {
                    height: parent.height
                    width: parent.width * 0.4
                    color: "transparent"
                    border.width: 1
                    border.color: "black"
                    
                    Row {
                        anchors.fill: parent
                        anchors.margins: 1
                        
                        Rectangle {
                            height: parent.height
                            width: parent.width * 0.5
                            color: "transparent"
                            border.width: 1
                            border.color: "black"
                            
                            Column {
                                anchors.fill: parent
                                anchors.margins: 1
                                
                                Rectangle {
                                    height: parent.height * 0.5
                                    width: parent.width
                                    border.width: 1
                                    border.color: "black"
                                    
                                    Text {
                                        text: "ORDER BOOK"
                                        font.pixelSize: 14
                                        font.bold: true
                                        anchors.centerIn: parent
                                    }
                                }
                                
                                Rectangle {
                                    height: parent.height * 0.5
                                    width: parent.width
                                    border.width: 1
                                    border.color: "black"
                                    
                                    Column {
                                        anchors.fill: parent
                                        anchors.margins: 2
                                        
                                        Rectangle {
                                            height: parent.height * 0.0625
                                            width: parent.width
                                            color: "transparent"
                                            
                                            Row {
                                                anchors.fill: parent
                                                Rectangle {
                                                    height: parent.height
                                                    width: parent.width * 0.4
                                                    border.width: 1
                                                    border.color: "black"
                                                    color: "#e8f4fd"
                                                    
                                                    Text {
                                                        text: "Balance"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                                Rectangle {
                                                    height: parent.height
                                                    width: parent.width * 0.6
                                                    border.width: 1
                                                    border.color: "black"
                                                    color: "#f0f0f0"
                                                    
                                                    Text {
                                                        text: "$12,897,645.64"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                            }
                                        }
                                        
                                        Rectangle {
                                            height: parent.height * 0.0625
                                            width: parent.width
                                            color: "transparent"
                                            
                                            Row {
                                                anchors.fill: parent
                                                Rectangle {
                                                    height: parent.height
                                                    width: parent.width * 0.4
                                                    border.width: 1
                                                    border.color: "black"
                                                    color: "#e8f4fd"
                                                    
                                                    Text {
                                                        text: "PnL"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                                Rectangle {
                                                    height: parent.height
                                                    width: parent.width * 0.6
                                                    border.width: 1
                                                    border.color: "black"
                                                    color: "#f0f0f0"
                                                    
                                                    Text {
                                                        text: "-$8,745,601.73"
                                                        color: "red"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                            }
                                        }
                                        
                                        Rectangle {
                                            height: parent.height * 0.0625
                                            width: parent.width
                                            color: "transparent"
                                            
                                            Row {
                                                anchors.fill: parent
                                                Rectangle {
                                                    height: parent.height
                                                    width: parent.width * 0.4
                                                    border.width: 1
                                                    border.color: "black"
                                                    color: "#e8f4fd"
                                                    
                                                    Text {
                                                        text: "Latency"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                                Rectangle {
                                                    height: parent.height
                                                    width: parent.width * 0.6
                                                    border.width: 1
                                                    border.color: "black"
                                                    color: "#f0f0f0"
                                                    
                                                    Text {
                                                        text: "latency"
                                                        color: "blue"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                            }
                                        }
                                        
                                        Rectangle {
                                            height: parent.height * 0.0625
                                            width: parent.width
                                            color: "transparent"
                                            
                                            Row {
                                                anchors.fill: parent
                                                Rectangle {
                                                    height: parent.height
                                                    width: parent.width * 0.4
                                                    border.width: 1
                                                    border.color: "black"
                                                    color: "#e8f4fd"
                                                    
                                                    Text {
                                                        text: "BPS"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                                Rectangle {
                                                    height: parent.height
                                                    width: parent.width * 0.6
                                                    border.width: 1
                                                    border.color: "black"
                                                    color: "#f0f0f0"
                                                    
                                                    Text {
                                                        text: "+1645"
                                                        color: "green"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        Rectangle {
                            height: parent.height
                            width: parent.width * 0.5
                            border.width: 1
                            border.color: "black"
                            
                            Text {
                                text: "ORDER MANAGEMENT"
                                color: "black"
                                font.pixelSize: 14
                                font.bold: true
                                anchors.centerIn: parent
                            }
                        }
                    }
                }
            }
        }
    }

}