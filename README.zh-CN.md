# A2A Client UI

一个基于 Tauri + React + TypeScript 构建的现代化 A2A (Agent-to-Agent) 客户端桌面应用。

## 🚀 项目简介

A2A Client UI 是一个跨平台的桌面应用程序，提供了与 A2A 服务器进行交互的友好界面。该应用支持多标签页聊天、实时流式响应、消息历史管理等功能，为用户提供了流畅的 AI 对话体验。

## ✨ 主要功能

- **多标签页聊天**: 支持同时进行多个对话会话
- **实时流式响应**: 支持 AI 消息的实时流式显示
- **A2A 服务器管理**: 支持配置和管理多个 A2A 服务器
- **跨平台支持**: 支持 Windows、macOS 和 Linux

## 📦 安装和运行

### 环境要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Rust** >= 1.85.0
- **Cargo** (Rust 包管理器)

### 安装依赖

```bash
# 安装前端依赖
pnpm install

# 安装 Rust 依赖 (会自动执行)
cargo build
```

### 开发模式

```bash
# 启动开发服务器
pnpm dev

# 或者使用 Tauri 开发模式
pnpm tauri dev
```

### 构建应用

```bash
# 构建前端
pnpm build

# 构建桌面应用
pnpm tauri build
```

## 🎯 核心功能模块

### 聊天功能
- **MessageList**: 消息列表组件，支持虚拟滚动
- **ChatInput**: 聊天输入组件，支持流式响应
- **MessageItem**: 单条消息组件，支持复制和渲染

### 设置功能
- **A2A 服务器管理**: 配置和管理 A2A 服务器
- **模型配置**: 设置 AI 模型参数
- **代理管理**: 配置聊天代理

### 系统功能
- **多标签页**: 支持多个对话会话
- **本地存储**: 使用 SQLite 存储聊天历史
- **系统集成**: 与操作系统深度集成

## 🔧 配置说明

### 开发环境配置

在 `config/config.ts` 中可以配置开发环境的代理设置：

```typescript
proxy: {
    "/admin": {
        target: "http://localhost:8080",
        changeOrigin: true,
    },
}
```

### Tauri 配置

在 `src-tauri/tauri.conf.json` 中可以配置应用的基本信息：

```json
{
  "productName": "A2A Client",
  "version": "0.1.4",
  "identifier": "site.cj2a7t.opena2a"
}
```

## 🚀 部署

### 构建生产版本

```bash
# 构建所有平台的安装包
pnpm tauri build

# 构建特定平台
pnpm tauri build --target x86_64-apple-darwin  # macOS
pnpm tauri build --target x86_64-pc-windows-msvc  # Windows
pnpm tauri build --target x86_64-unknown-linux-gnu  # Linux
```

构建完成后，安装包将位于 `src-tauri/target/release/bundle/` 目录下。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

**注意**: 这是一个开发中的项目，功能可能会持续更新和改进。 