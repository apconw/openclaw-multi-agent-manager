<p align="center">
  <img src="https://img.icons8.com/fluency/96/bot.png" alt="Openclaw Multi-Agent Manager" width="96"/>
</p>

<h3 align="center">Openclaw Multi-Agent Manager</h3>

<p align="center">
  Openclaw 数字人孵化平台 · 飞书多智能体管理器
</p>

<p align="center">
  自定义角色 · 可视化配置飞书 Bot 凭证 · 一键部署多智能体协作团队到 Openclaw
</p>

<p align="center">
  <a href="https://github.com/nicekate/openclaw-multi-agent-manager/releases"><img src="https://img.shields.io/github/v/release/nicekate/openclaw-multi-agent-manager" alt="Release Version" /></a>
  <a href="https://github.com/nicekate/openclaw-multi-agent-manager/stargazers"><img src="https://img.shields.io/github/stars/nicekate/openclaw-multi-agent-manager?style=flat" alt="GitHub Stars" /></a>
  <a href="https://github.com/nicekate/openclaw-multi-agent-manager/blob/main/LICENSE"><img src="https://img.shields.io/github/license/nicekate/openclaw-multi-agent-manager" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js" />
</p>

> **注意：** 目前仅支持飞书（Feishu / Lark）平台机器人，其他 IM 平台支持正在规划中。

## 演示视频

<table align="center">
  <tr>
    <th>🎯 多智能体团队创建与部署</th>
  </tr>
  <tr>
    <td>
      <video src="https://github.com/user-attachments/assets/e6c5fa08-b888-4b15-9569-d246ab597712" controls="controls" muted="muted" style="max-height:480px; min-height: 200px;"></video>
    </td>
  </tr>
</table>

## 功能特性

- **可视化向导** — 5 步创建智能体团队：选择角色 → 填写飞书凭证 → 定义协作关系 → 预览配置 → 一键初始化
- **6 个预置角色** — 大总管、开发助理、内容助理、运营助理、法务助理、财务助理，开箱即用
- **角色库** — 内置 20+ 角色模板，支持按分类浏览，也可自定义创建
- **团队管理** — 保存、加载、编辑、删除团队配置，支持冲突检测
- **协作拓扑** — 可视化 Agent 间的协作关系图，定义消息路由
- **飞书集成** — 自动配置飞书自建应用的 Bot 能力、事件订阅、权限
- **本地初始化** — 通过 SSE 流式推送 9 阶段初始化进度，实时查看日志

## 技术栈

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" />
</p>

## 快速开始

### 环境要求

- Node.js >= 18.0.0

### 安装

```bash
npm install
cd web && npm install
```

### 开发模式

```bash
# 同时启动 API 服务器 (端口 3789) 和前端开发服务器 (端口 5173)
npm run dev
```

也可以分别启动：

```bash
# 仅启动后端 API
npm run team-config-api

# 仅启动前端
npm run dev:web-only
```

### 构建

```bash
npm run build
```

### 测试

```bash
npm test
```

## 项目结构

```
├── src/                        # 后端
│   ├── index.ts                # 主入口 (交互式配置向导)
│   ├── teamConfigApiServer.ts  # HTTP API 服务器
│   ├── teamConfigStore.ts      # 团队配置持久化
│   ├── roleLibraryStore.ts     # 角色库 CRUD
│   ├── roleCategoryStore.ts    # 角色分类管理
│   ├── localOpenclawInit.ts    # 本地 CLI 初始化 & 团队清理
│   ├── localInitPhases.ts      # 初始化阶段定义
│   └── db.ts                   # SQLite 数据库
├── web/                        # React 前端
│   └── src/
│       ├── App.tsx             # 主应用 (创建 / 团队 / 角色库 三个 Tab)
│       ├── components/         # 16 个 UI 组件
│       └── utils/              # API 客户端 & 配置生成器
├── shared/                     # 前后端共享
│   ├── types.ts                # 类型定义
│   ├── agent-templates.ts      # 预置角色模板
│   ├── role-library.ts         # 角色库数据
│   └── validation.ts           # 校验逻辑
├── tests/                      # 单元测试
└── data/                       # SQLite 数据库文件
```

## API 接口

API 服务运行在端口 `3789`（可通过 `TEAM_CONFIG_API_PORT` 环境变量修改）。

### 团队配置

| 方法   | 路径                             | 说明           |
| ------ | -------------------------------- | -------------- |
| GET    | `/api/team-configs`              | 获取所有团队   |
| POST   | `/api/team-configs`              | 创建/更新团队  |
| GET    | `/api/team-configs/:id`          | 获取单个团队   |
| DELETE | `/api/team-configs/:id`          | 删除团队       |
| POST   | `/api/team-configs/:id/teardown` | 清理团队 (SSE) |

### 角色库

| 方法   | 路径                    | 说明         |
| ------ | ----------------------- | ------------ |
| GET    | `/api/role-library`     | 获取所有角色 |
| POST   | `/api/role-library`     | 创建角色     |
| DELETE | `/api/role-library/:id` | 删除角色     |

### 角色分类

| 方法 | 路径                   | 说明         |
| ---- | ---------------------- | ------------ |
| GET  | `/api/role-categories` | 获取所有分类 |
| POST | `/api/role-categories` | 创建分类     |

### 其他

| 方法 | 路径              | 说明                  |
| ---- | ----------------- | --------------------- |
| POST | `/api/local-init` | 本地初始化 (支持 SSE) |
| GET  | `/api/health`     | 健康检查              |

## 环境变量

| 变量                         | 说明              | 默认值                         |
| ---------------------------- | ----------------- | ------------------------------ |
| `TEAM_CONFIG_API_PORT`       | API 服务端口      | `3789`                         |
| `OPENCLAW_CLI`               | OpenClaw CLI 路径 | 系统 PATH                      |
| `FEISHU_MULTI_AGENT_DB_PATH` | 数据库文件路径    | `./data/feishu-multi-agent.db` |

## 预置角色

| 角色    | 中文名   | 职责                     |
| ------- | -------- | ------------------------ |
| steward | 大总管   | 任务分发与协调           |
| dev     | 开发助理 | 代码、架构、DevOps       |
| content | 内容助理 | 文案、内容策划           |
| ops     | 运营助理 | 增长、数据分析、活动策划 |
| law     | 法务助理 | 合同、合规、风险管理     |
| finance | 财务助理 | 记账、预算、财务分析     |

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

MIT
