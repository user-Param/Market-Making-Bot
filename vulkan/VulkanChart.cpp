#include <QVulkanWindow>
class TestWindow : public QVulkanWindow {
    QVulkanWindowRenderer* createRenderer() override { 
        return nullptr; 
    }
};