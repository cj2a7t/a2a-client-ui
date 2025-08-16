import { useFlatInject, useHttp } from "@/utils/hooks";
import { useTabKey } from "@/utils/tabkey";
import { StarFilled } from "@ant-design/icons";
import { Layout } from "antd";
import { Outlet } from "umi";
import HeaderTab from "./components/HeaderTab";

const { Header, Content } = Layout;
const LayoutFC = () => {
    const [store] = useFlatInject("connection");
    const tabKey = useTabKey();
    const { loading: loadingFetchCon } = useHttp(() =>
        store.onFetchConnections()
    );

    const handleDragStart = (event: any) => {
        event.preventDefault();
    };

    const renderItem = (name: string, url: string, isStarred?: boolean) => ({
        value: url,
        label: (
            <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <span>{name}</span>
                    {isStarred && <StarFilled style={{ color: "#fadb14" }} />}
                </div>
                <div style={{ color: "#888", fontSize: 11 }}>{url}</div>
            </div>
        ),
    });

    const renderEmptyItem = (label: string) => ({
        value: "",
        label: (
            <div
                style={{
                    fontSize: 11,
                    color: "#999",
                    fontStyle: "italic",
                }}
            >
                {label}
            </div>
        ),
        disabled: true,
    });

    const starredConnections = store.connections.filter((c) => c.starred);
    const recentConnections = store.connections.filter((c) => !c.starred);

    const options = [
        {
            label: <span style={{ fontSize: 11 }}>⭐ Starred Connections</span>,
            options:
                starredConnections.length > 0
                    ? starredConnections.map((conn) =>
                        renderItem(conn.name, conn.url, true)
                    )
                    : [renderEmptyItem("No starred connections")],
        },
        {
            label: <span style={{ fontSize: 11 }}>🕑 Recent Connections</span>,
            options:
                recentConnections.length > 0
                    ? recentConnections.map((conn) =>
                        renderItem(conn.name, conn.url, false)
                    )
                    : [renderEmptyItem("No recent connections")],
        },
    ];

    return (
        <Layout className="custom-layout" style={{ minHeight: "100vh" }}>
            <Header
                data-tauri-drag-region
                onMouseDown={handleDragStart}
                style={{
                    backgroundColor: "#595959",
                    height: 36,
                    userSelect: "none",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    paddingLeft: "80px",
                }}
                className="tauri-drag"
            >
                <div className="app-title">
                    <div className="app-title-main">ZOAP</div>
                    <div className="app-title-sub">OpenA2A</div>
                </div>
                <HeaderTab />
            </Header>
            <Layout>
                <Layout>
                    <Content className="custom-layout">
                        <Outlet />
                    </Content>
                </Layout>
            </Layout>

        </Layout>
    );
};

export default LayoutFC;
