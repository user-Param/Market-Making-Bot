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
        
        // Top Status Bar (5%)
        Rectangle {
            width: parent.width
            height: parent.height * 0.05
            border.width: 1
            border.color: "black"
        }
        
        // Main Content Area (70%)
        Rectangle {
            width: parent.width
            height: parent.height * 0.7
            color: "transparent"
            border.width: 1
            border.color: "black"
            
            Row {
                anchors.fill: parent
                anchors.margins: 1
                
                // Left Chart Area (60%)
                Rectangle {
                    height: parent.height
                    width: parent.width * 0.6
                    border.width: 1
                    border.color: "black"
                    
                    Text {
                        text: "PRICE CHART AREA"
                        font.pixelSize: 24
                        anchors.centerIn: parent
                    }
                }
                
                // Right Controls Area (40%)
                Rectangle {
                    height: parent.height
                    width: parent.width * 0.4
                    color: "transparent"
                    border.width: 1
                    border.color: "black"
                    
                    Row {
                        anchors.fill: parent
                        anchors.margins: 1
                        
                        // Left Metrics Panel (50%)
                        Rectangle {
                            height: parent.height
                            width: parent.width * 0.5
                            color: "transparent"
                            border.width: 1
                            border.color: "black"
                            
                            Column {
                                anchors.fill: parent
                                anchors.margins: 1
                                
                                // Top: Order Book
                                Rectangle {
                                    height: parent.height * 0.5
                                    width: parent.width
                                    border.width: 1
                                    border.color: "black"
                                    
                                    Text {
                                        text: "ORDER BOOK"
                                        font.pixelSize: 14
                                        anchors.centerIn: parent
                                    }
                                }
                                
                                // Bottom: Trading Metrics
                                Rectangle {
                                    height: parent.height * 0.5
                                    width: parent.width
                                    border.width: 1
                                    border.color: "black"
                                    
                                    Column {
                                        anchors.fill: parent
                                        anchors.margins: 2
                                        
                                        // All your metric rows - using basic Rectangles
                                        // Balance
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
                                                    
                                                    Text {
                                                        text: "$12,897,645.64"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                            }
                                        }
                                        
                                        // PnL
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
                                                    
                                                    Text {
                                                        text: "-$8,745,601.73"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                            }
                                        }
                                        
                                        // Latency
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
                                                    
                                                    Text {
                                                        text: "13ms"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                            }
                                        }
                                        
                                        // Continue with all your other metrics...
                                        // BPS, CTR, PFI, PTRC, ISM, uSpread, NatCat, ACK, RTL, E-Stop, PLR, MRM, MAE, ORT
                                        // ... (copy the same pattern for each metric)
                                        
                                        // Example: BPS
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
                                                    
                                                    Text {
                                                        text: "+1645"
                                                        color: "black"
                                                        font.pixelSize: 11
                                                        anchors.centerIn: parent
                                                    }
                                                }
                                            }
                                        }
                                        
                                        // Add the remaining 13 metrics following the same pattern...
                                        
                                    }
                                }
                            }
                        }
                        
                        // Right Trading Panel (50%)
                        Rectangle {
                            height: parent.height
                            width: parent.width * 0.5
                            border.width: 1
                            border.color: "black"
                            
                            Text {
                                text: "TRADING CONTROLS"
                                color: "black"
                                font.pixelSize: 14
                                anchors.centerIn: parent
                            }
                        }
                    }
                }
            }
        }
    }
}