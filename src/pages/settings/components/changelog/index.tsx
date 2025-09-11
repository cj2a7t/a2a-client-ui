import {
  ApiOutlined,
  BookOutlined,
  CheckCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Divider, Space, Tag, Typography } from "antd";
import React from "react";
import "./style.less";

const { Title, Text, Paragraph } = Typography;

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "improvement" | "fix" | "breaking";
  title: string;
  description: string[];
}

const Changelog: React.FC = () => {
  // Changelog data
  const changelogData: ChangelogEntry[] = [
    {
      version: "0.1.4",
      date: "2025-01-15",
      type: "feature",
      title: "Support for Data Type Passthrough",
      description: [
        "Added support for passing through data with kind type 'data'",
      ],
    },
    {
      version: "0.1.3",
      date: "2025-01-10",
      type: "fix",
      title: "Application Startup Fix",
      description: [
        "Fixed application panic issue during startup",
      ],
    },
    {
      version: "0.1.2",
      date: "2025-09-09",
      type: "improvement",
      title: "A2A Protocol Optimizations and Custom Data Support",
      description: [
        "Optimized A2A calls by removing unnecessary processes",
        "Added support for custom A2A Protocol Data Object configuration",
      ],
    },
    {
      version: "0.1.1",
      date: "2025-09-03",
      type: "improvement",
      title: "Bug Fixes and Optimizations",
      description: [
        "Optimized A2A protocol response body output during exceptions",
        "Fixed system prompt XML issues",
      ],
    },
    {
      version: "0.1.0",
      date: "2025-08-26",
      type: "feature",
      title: "Initial Release - A2A-Client-UI",
      description: [
        "Multi-Agent debugging support for A2A workflows",
        "Intelligent model chat with streaming responses",
        "Browser-like interactive experience with modern UI",
        "Local persistence for model and A2A Servers configuration",
      ],
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "blue";
      case "improvement":
        return "green";
      case "fix":
        return "orange";
      case "breaking":
        return "red";
      default:
        return "default";
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "feature":
        return "Feature";
      case "improvement":
        return "Improvement";
      case "fix":
        return "Fix";
      case "breaking":
        return "Breaking";
      default:
        return type;
    }
  };

  // Get icon for description item based on content
  const getDescriptionIcon = (description: string) => {
    if (
      description.includes("styling") ||
      description.includes("UI") ||
      description.includes("interaction")
    ) {
      return (
        <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
      );
    } else if (
      description.includes("streaming") ||
      description.includes("real-time")
    ) {
      return <SyncOutlined style={{ color: "#1890ff", marginRight: 8 }} />;
    } else if (
      description.includes("IPC") ||
      description.includes("HTTP") ||
      description.includes("API")
    ) {
      return <ApiOutlined style={{ color: "#722ed1", marginRight: 8 }} />;
    } else {
      return (
        <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
      );
    }
  };

  return (
    <div className="changelog-settings">
      <div className="changelog-header">
        <Space align="center">
          <BookOutlined style={{ color: "#ff8c00", fontSize: 20 }} />
          <Title level={3} style={{ margin: 0 }}>
            Changelog
          </Title>
        </Space>
      </div>

      <div className="changelog-content">
        {changelogData.map((entry, index) => (
          <div key={index} className="changelog-entry">
            <div className="changelog-entry-header">
              <Space align="center">
                <Title level={4} style={{ margin: 0 }}>
                  v{entry.version}
                </Title>
                <Tag color={getTypeColor(entry.type)}>
                  {getTypeText(entry.type)}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {entry.date}
                </Text>
              </Space>
            </div>
            <Title level={5} style={{ margin: "8px 0 4px 0" }}>
              {entry.title}
            </Title>
            <Paragraph style={{ margin: 0, color: "#666" }}>
              {entry.description.map((desc, descIndex) => (
                <div
                  key={descIndex}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  {getDescriptionIcon(desc)}
                  <span>{desc}</span>
                </div>
              ))}
            </Paragraph>
            {index < changelogData.length - 1 && (
              <Divider style={{ margin: "16px 0" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Changelog;
