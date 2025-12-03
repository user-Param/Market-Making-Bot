cmake_minimum_required(VERSION 3.16)
project(cryptoArbitrage VERSION 0.1 LANGUAGES CXX)
set(CMAKE_BUILD_TYPE Release)
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -march=native -flto -funroll-loops -fstrict-aliasing")
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_INTERPROCEDURAL_OPTIMIZATION ON)  
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -march=native -funroll-loops -fstrict-aliasing -ffast-math")
set(CMAKE_C_FLAGS_RELEASE   "-O3 -march=native -funroll-loops -fstrict-aliasing -ffast-math")
add_definitions(-DNDEBUG)
add_definitions(-DQT_NO_DEBUG_OUTPUT)
add_definitions(-DQT_NO_WARNING_OUTPUT)
add_definitions(-DQT_NO_INFO_OUTPUT)

set(CMAKE_EXE_LINKER_FLAGS_RELEASE "-Wl,-O3")

find_package(Qt6 6.8 REQUIRED COMPONENTS Quick WebSockets)
find_package(ZLIB REQUIRED)

qt_standard_project_setup(REQUIRES 6.8)

qt_add_executable(appcryptoArbitrage
    main.cpp
    dataPipeline.cpp
)

set_target_properties(appcryptoArbitrage PROPERTIES
    MACOSX_BUNDLE TRUE
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
    MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}
)

target_link_libraries(appcryptoArbitrage
    PRIVATE Qt6::Quick 
    PRIVATE Qt6::WebSockets
    PRIVATE ZLIB::ZLIB
)

include(GNUInstallDirs)
install(TARGETS appcryptoArbitrage
    BUNDLE DESTINATION .
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
