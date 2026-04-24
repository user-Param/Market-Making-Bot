cmake_minimum_required(VERSION 3.16)
project(cryptoArbitrage VERSION 0.1 LANGUAGES C CXX)

set(CMAKE_BUILD_TYPE Release)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Optimization flags
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -march=native -funroll-loops -fstrict-aliasing -ffast-math")
set(CMAKE_C_FLAGS_RELEASE "-O3 -march=native -funroll-loops")
set(CMAKE_EXE_LINKER_FLAGS_RELEASE "-Wl,-O3")
add_definitions(-DNDEBUG)

# Find Qt6 components - ADD Network and Core!
find_package(Qt6 6.8 REQUIRED COMPONENTS Core Network WebSockets)
find_package(ZLIB REQUIRED)

qt_standard_project_setup(REQUIRES 6.8)

# Set strategy.c as C language
set_source_files_properties(StrategyEngine/strategy.c PROPERTIES LANGUAGE C)

# Create executable
qt_add_executable(Market-making-bot
    main.cpp
    dataPipeline.cpp
    StrategyEngine/strategy.c
)

# Set bundle properties
set_target_properties(Market-making-bot PROPERTIES
    MACOSX_BUNDLE TRUE
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
    MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}
)

# Link libraries - ADD Qt6::Core and Qt6::Network
target_link_libraries(Market-making-bot
    PRIVATE Qt6::Core
    PRIVATE Qt6::Network
    PRIVATE Qt6::WebSockets
    PRIVATE ZLIB::ZLIB
)

# Enable AUTOMOC for dataPipeline.h
set_target_properties(Market-making-bot PROPERTIES
    AUTOMOC ON
)

# Include directories
target_include_directories(Market-making-bot PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/StrategyEngine
)

include(GNUInstallDirs)
install(TARGETS Market-making-bot
    BUNDLE DESTINATION .
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)