cmake_minimum_required(VERSION 3.16)
project(cryptoArbitrage VERSION 0.1 LANGUAGES CXX)
find_package(Qt6 6.8 REQUIRED COMPONENTS Quick WebSockets)
find_package(ZLIB REQUIRED)

set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.8 REQUIRED COMPONENTS Quick WebSockets)

qt_standard_project_setup(REQUIRES 6.8)

qt_add_executable(appcryptoArbitrage
    main.cpp
    dataPipeline.cpp
)

qt_add_qml_module(appcryptoArbitrage
    URI cryptoArbitrage
    VERSION 1.0
    QML_FILES
        Main.qml
)

set_target_properties(appcryptoArbitrage PROPERTIES
    MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
    MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}
    MACOSX_BUNDLE TRUE
    WIN32_EXECUTABLE TRUE
)

target_link_libraries(appcryptoArbitrage
    PRIVATE Qt6::Quick Qt6::WebSockets
)

include(GNUInstallDirs)
install(TARGETS appcryptoArbitrage
    BUNDLE DESTINATION .
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

target_link_libraries(appcryptoArbitrage
    PRIVATE Qt6::Quick 
    PRIVATE Qt6::WebSockets
    PRIVATE ZLIB::ZLIB 
)