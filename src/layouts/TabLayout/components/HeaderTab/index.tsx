import { getTabKey } from "@/utils/tabkey";
import { RobotOutlined } from "@ant-design/icons";
import { Button, Flex, Tooltip } from "antd";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "umi";
import { v4 as uuidv4 } from "uuid";
import { useFlatInject } from "@/utils/hooks";
import "./style.less";

interface TabItem {
    label: string;
    key: string;
    path: string;
}

const MIN_TABS = 1;
const MAX_TABS = 1000; // Remove 20 tab limit, set to 1000
const MIN_TAB_WIDTH = 60; // Minimum tab width
const PREFERRED_TAB_WIDTH = 120; // Preferred tab width
const MAX_TAB_WIDTH = 160; // Maximum tab width

const HeaderTab: React.FC = () => {
    const nav = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [items, setItems] = useState<TabItem[]>([]);
    const [activeKey, setActiveKey] = useState("");
    const location = useLocation();
    const [a2aStore] = useFlatInject("a2a");

    const canRemoveTab = items.length > MIN_TABS;
    const canAddTab = items.length < MAX_TABS;

    // Calculate tab width
    const calculateTabWidth = useCallback(() => {
        if (!containerRef.current) return PREFERRED_TAB_WIDTH;
        
        const containerWidth = containerRef.current.offsetWidth;
        const availableWidth = containerWidth - 100; // Subtract button and margin
        const totalTabs = items.length;
        
        if (totalTabs === 0) return PREFERRED_TAB_WIDTH;
        
        let tabWidth = Math.max(MIN_TAB_WIDTH, availableWidth / totalTabs);
        tabWidth = Math.min(tabWidth, MAX_TAB_WIDTH);
        
        return Math.floor(tabWidth);
    }, [items.length]);

    // Scroll to active tab
    const scrollToActiveTab = useCallback(() => {
        if (!scrollContainerRef.current || !containerRef.current) return;
        
        const scrollContainer = scrollContainerRef.current;
        const container = containerRef.current;
        const activeTab = scrollContainer.querySelector('.tab-item.active') as HTMLElement;
        
        if (activeTab) {
            const tabLeft = activeTab.offsetLeft;
            const tabWidth = activeTab.offsetWidth;
            const containerWidth = container.offsetWidth;
            
            scrollContainer.scrollLeft = tabLeft - (containerWidth - tabWidth) / 2;
        }
    }, []);

    // Handle wheel event
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (scrollContainerRef.current) {
            e.preventDefault();
            scrollContainerRef.current.scrollLeft += e.deltaY;
        }
    }, []);

    useEffect(() => {
        const pathname = location.pathname;
        let tabKey = getTabKey(location.search);
        if (!tabKey || tabKey == "") {
            tabKey = uuidv4();
            nav(`${pathname}?tabKey=${tabKey}`, { replace: true });
            return;
        }
        const exists = items.find((item) => item.key === tabKey);
        const labelMap: Record<string, string> = {
            "/new_connection": "New Connection",
            "/xds": "xDS Overview",
            "/a2a": "A2A Client",
        };
        const newLabel = labelMap[pathname] ?? "Untitled Tab";

        if (!exists) {
            const newTab = {
                label: newLabel,
                key: tabKey,
                path: `${pathname}?tabKey=${tabKey}`,
            };
            setItems((prev) => [...prev, newTab]);
        } else {
            setItems((prev) =>
                prev.map((item) =>
                    item.key === tabKey
                        ? {
                            ...item,
                            label: newLabel,
                            path: `${pathname}?tabKey=${tabKey}`,
                        }
                        : item
                )
            );
        }

        setActiveKey(tabKey);
        
        // Delayed scroll to active tab, ensure DOM is updated
        setTimeout(scrollToActiveTab, 100);
    }, [location, scrollToActiveTab]);

    const switchTab = async (tabKey: string) => {
        // Set loading state for the new tab
        await a2aStore.setTabLoading(tabKey, true);
        
        setActiveKey(tabKey);
        const matchItem = items.find((item) => item.key === tabKey);
        if (matchItem?.path) {
            nav(matchItem.path);
        }
        
        // Wait for navigation to complete before clearing loading
        setTimeout(async () => {
            // Double check if we're still on the same tab
            if (activeKey === tabKey) {
                await a2aStore.setTabLoading(tabKey, false);
            }
        }, 800);
    };

    const addTab = async () => {
        if (!canAddTab) {
            return;
        }

        const newKey = uuidv4();
        const newTab = {
            label: "A2A Client",
            key: newKey,
            path: `/a2a?tabKey=${newKey}`,
        };
        const newPanes = [...items, newTab];
        setItems(newPanes);
        setActiveKey(newKey);
        
        // Set loading state for the new tab
        await a2aStore.setTabLoading(newKey, true);
        nav(newTab.path);
        
        // Clear loading state after a short delay
        setTimeout(async () => {
            await a2aStore.setTabLoading(newKey, false);
        }, 500);
    };

    const removeTab = (tabKey: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (items.length <= MIN_TABS) {
            return;
        }

        let newActiveKey = activeKey;
        let lastIndex = -1;
        items.forEach((item, i) => {
            if (item.key === tabKey) lastIndex = i - 1;
        });

        const newPanes = items.filter((item) => item.key !== tabKey);
        if (newPanes.length && newActiveKey === tabKey) {
            if (lastIndex >= 0) {
                newActiveKey = newPanes[lastIndex].key;
            } else {
                newActiveKey = newPanes[0].key;
            }
        }

        setItems(newPanes);
        setActiveKey(newActiveKey);
        const match = newPanes.find((item) => item.key === newActiveKey);
        if (match) {
            nav(match.path);
        }
    };

    const tabWidth = calculateTabWidth();

    return (
        <div
            className="custom-header-tab"
            data-tauri-drag-region
            ref={containerRef}
        >
            <Flex align="center" gap={8} className="tab-container">
                {/* Tab scroll container */}
                <div 
                    className="tab-scroll-container"
                    ref={scrollContainerRef}
                    onWheel={handleWheel}
                >
                    <div className="tab-items-container">
                        {items.map((item) => (
                            <div
                                key={item.key}
                                className={`tab-item ${
                                    activeKey === item.key ? "active" : ""
                                }`}
                                onClick={() => switchTab(item.key)}
                                style={{ width: `${tabWidth}px` }}
                            >
                                <RobotOutlined className="tab-icon" />
                                <span className="tab-label" title={item.label}>
                                    {item.label}
                                </span>
                                {canRemoveTab && (
                                    <Button
                                        type="text"
                                        size="small"
                                        className="tab-close-btn"
                                        onClick={(e) => removeTab(item.key, e)}
                                    >
                                        ×
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Add Tab button */}
                {canAddTab && (
                    <Tooltip title="Add new tab">
                        <Button
                            type="text"
                            size="small"
                            className="tab-add-btn"
                            onClick={addTab}
                        >
                            +
                        </Button>
                    </Tooltip>
                )}
            </Flex>
        </div>
    );
};

export default HeaderTab;
