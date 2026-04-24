cmake_minimum_required(VERSION 3.15)
project(JupiterPerpsFeed)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find packages
find_package(Boost REQUIRED COMPONENTS)
find_package(nlohmann_json REQUIRED)
find_package(OpenSSL REQUIRED)

# Include directories
include_directories(${Boost_INCLUDE_DIRS})
include_directories(${OPENSSL_INCLUDE_DIR})

# Main executable
add_executable(jupiter_feed
    main.cpp
    exchange/Exchange1.cpp
    datapipeline/dataPipeline.cpp
)

# Link libraries
target_link_libraries(jupiter_feed
    ${Boost_LIBRARIES}
    ${OPENSSL_LIBRARIES}
    nlohmann_json::nlohmann_json
)

# Thread support
find_package(Threads REQUIRED)
target_link_libraries(jupiter_feed Threads::Threads)