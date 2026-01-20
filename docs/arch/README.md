# OpenCode 架构文档

> 系统性分析 OpenCode 项目架构的完整文档集

---

## 文档索引

### [0. 架构概览](./0.Overview.md)
**系统定位、技术栈、架构原则、数据流、关键决策**

- 系统类型：多端 AI 编程助手平台（CLI/Desktop/Web）
- 核心功能：开源、提供商无关的 AI 编程代理
- 技术栈：Bun + TypeScript + SolidJS + Tauri
- 架构原则：分层架构、Namespace 模式、事件驱动
- 关键决策：Bun 运行时、JSON 存储、Client-Server 架构、权限系统、Monorepo

---

### [1. 系统上下文与容器](./1.Context-Containers.md)
**C4 Level 1 系统上下文图、C4 Level 2 容器图、进程划分、IPC 机制、资源管理**

- **系统上下文**：用户、OpenCode 系统、外部系统（LLM/MCP/LSP/Git）
- **容器视图**：CLI 进程、HTTP 服务器、Tauri 主进程、WebView、子进程（PTY/LSP/MCP）
- **进程通信**：HTTP/SSE、WebSocket、JSON-RPC、Stdio
- **资源管理**：启动顺序、依赖关系、崩溃处理、清理机制

---

### [2. 模块分层架构](./2.Modules.md)
**分层结构、模块职责、依赖规则、模块边界**

- **表现层**：CLI/TUI、Web/Desktop 前端、HTTP 路由
- **应用层**：SessionProcessor、SessionPrompt、ToolRegistry、LLM Stream Handler
- **领域层**：Session、Agent、Tool、Provider、Permission、Message
- **基础设施层**：Storage、LSP、MCP、PTY、Bus、Log、Config、Instance
- **依赖规则**：严格单向依赖、Namespace 隔离、事件驱动解耦

---

### [3. 核心流程时序](./3.Sequences.md)
**核心业务流程、Mermaid 时序图、数据流、错误处理**

- **流程 1**：用户提示处理流程（完整的 AI 交互流程）
- **流程 2**：工具执行流程（Bash 工具示例）
- **流程 3**：权限请求与响应流程
- **流程 4**：上下文压缩流程（Compaction）
- **流程 5**：MCP 工具调用流程

---

### [4. 接口与协议规范](./4.Interfaces.md)
**外部接口（优先）、进程间接口、内部接口、通信协议、数据格式、版本兼容性**

- **外部接口**：HTTP REST API、OpenCode SDK、SSE Event Stream、OpenAPI Specification
- **进程间接口**：WebSocket (PTY)、JSON-RPC (LSP/MCP)、Stdio (MCP Local)
- **内部接口**：Session、SessionPrompt、Tool、Provider、PermissionNext、Storage、Bus、Instance
- **通信协议**：HTTP/SSE、WebSocket、JSON-RPC
- **数据格式**：JSON、ULID 标识符、ISO 8601 时间戳

---

### [5. 数据模型与状态管理](./5.Data-State.md)
**数据模型、状态管理、持久化、缓存策略**

- **核心实体**：Session、Message、Part、Agent、Provider、Project
- **状态管理**：SolidJS Stores（前端）、Instance.state()（后端）
- **持久化**：JSON 文件存储、增量加载、数据迁移
- **缓存策略**：内存缓存（LRU）、Prompt Caching（LLM）

---

### [6. 关键调用链详解](./6.Call-Chains.md)
**端到端调用链、性能分析、优化建议**

- **调用链 1**：用户提示处理（从 CLI 到 LLM 到工具执行）
- **调用链 2**：文件编辑（Edit 工具）
- **调用链 3**：代码搜索（Grep 工具）
- **调用链 4**：会话分享（上传到 S3）
- **性能分析**：瓶颈点识别、优化建议

---

### [7. 设计决策与权衡](./7.Decisions.md)
**技术选型、设计决策、权衡分析、未来演进**

- **决策 1**：Bun 作为主要运行时
- **决策 2**：JSON 文件存储 vs 数据库
- **决策 3**：Client-Server 架构
- **决策 4**：权限系统设计
- **决策 5**：Monorepo 结构
- **决策 6**：Vercel AI SDK
- **决策 7**：SolidJS 前端框架
- **决策 8**：Tauri 桌面框架

---

### [8. 风险点与改进建议](./8.Risks.md)
**风险识别、技术债务、改进路线图、监控建议**

- **架构风险**：单点故障、紧耦合、循环依赖
- **性能风险**：内存泄漏、性能瓶颈、资源耗尽
- **安全风险**：权限绕过、数据泄露、注入攻击
- **可维护性风险**：代码重复、缺乏文档、测试覆盖不足
- **改进路线图**：按优先级排序的改进项

---

## 使用建议

### 1. 按顺序阅读
建议按 0 → 8 的顺序阅读，每个文档都基于前面的内容。

### 2. 快速导航
- **新手**：从 [0.Overview](./0.Overview.md) 开始，了解系统全貌
- **开发者**：重点阅读 [2.Modules](./2.Modules.md) 和 [4.Interfaces](./4.Interfaces.md)
- **架构师**：关注 [7.Decisions](./7.Decisions.md) 和 [8.Risks](./8.Risks.md)
- **运维**：查看 [1.Context-Containers](./1.Context-Containers.md) 了解部署架构

### 3. 验证结果
文档中的代码路径和行号可能随版本更新而变化，建议通过代码搜索验证。

### 4. 反馈与更新
如发现文档与实际代码不符，请提交 Issue 或 PR。

---

## 文档版本

- **版本**：v2.0.0
- **生成日期**：2026-01-20
- **OpenCode 版本**：1.1.26+
- **更新内容**：
  - ✅ 文件名简化（`Architecture-*` → 简短名称）
  - ✅ 目录简化（`docs/architecture/` → `docs/arch/`）
  - ✅ 增加 C4 Level 1 系统上下文图
  - ✅ 所有图表统一使用 Mermaid
  - ✅ 外部接口优先（4.Interfaces.md）
  - ✅ 分层根据实际项目调整

---

## 相关资源

- **项目主页**：[OpenCode GitHub](https://github.com/different-ai/opencode)
- **官方文档**：[OpenCode Docs](https://opencode.dev/docs)
- **API 文档**：[OpenAPI Specification](./4.Interfaces.md#外部接口)
- **贡献指南**：[CONTRIBUTING.md](../../CONTRIBUTING.md)

---

## 许可证

本文档遵循 Apache 2.0 许可证。
