# Task vs Session 概念对比分析

## 概述

本文档对比分析 KiloCode 中的 `Task` 和 OpenCode 中的 `Session` 在概念、职责和功能上的差异。

---

## 1. 核心概念差异

### 1.1 KiloCode Task

**定义**: Task 是一个独立的任务执行单元,代表用户发起的一次完整的 AI 交互会话。

**核心特征**:
- 以任务为中心的设计
- 强调任务的生命周期管理(pending → running → completed/failed/cancelled)
- 关注任务的可见性和组织(收藏、搜索、分享)
- 面向结果的设计(token 使用、成本统计)

**数据模型**:
```typescript
{
  id: string
  prompt: string              // 初始任务描述
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  mode: string                // 执行模式
  favorite: boolean           // 收藏标记
  createdAt: datetime
  updatedAt: datetime
  completedAt: datetime
  tokenUsage: {
    input: number
    output: number
    total: number
  }
  cost: number
}
```

### 1.2 OpenCode Session

**定义**: Session 是一个持续的对话会话,支持多轮交互、分支和历史管理。

**核心特征**:
- 以会话为中心的设计
- 支持会话分支(fork)和层级关系(parentID)
- 强调对话的连续性和上下文管理
- 支持会话归档、分享和回滚
- 内置权限管理和压缩机制

**数据模型**:
```typescript
{
  id: string                  // ses_...
  slug: string                // 短标识符
  projectID: string
  directory: string           // 项目目录
  parentID?: string           // 父会话(fork)
  title: string
  version: string             // OpenCode 版本
  time: {
    created: number
    updated: number
    compacting?: number       // 压缩时间
    archived?: number         // 归档时间
  }
  summary?: {                 // 会话摘要
    additions: number
    deletions: number
    files: number
  }
  share?: {
    url: string
  }
  permission?: Ruleset        // 权限规则
  revert?: {                  // 回滚信息
    messageID: string
    partID?: string
    snapshot?: string
    diff?: string
  }
}
```

---

## 2. 职责对比

### 2.1 生命周期管理

| 维度 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 状态管理 | 5 种状态(pending/running/completed/failed/cancelled) | 隐式状态(通过 SessionStatus 管理) |
| 创建方式 | POST /tasks | POST /session |
| 完成标记 | completedAt 字段 | 无显式完成,通过最后消息判断 |
| 取消机制 | POST /tasks/{id}/cancel | POST /session/{id}/abort |
| 删除 | DELETE /tasks/{id} | DELETE /session/{id} |

### 2.2 消息管理

| 维度 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 消息获取 | GET /tasks/{id}/messages | GET /session/{id}/message |
| 发送消息 | POST /tasks/{id}/messages | POST /session/{id}/message (prompt) |
| 消息编辑 | PATCH /tasks/{id}/messages/{msgId} | 通过 fork 实现分支编辑 |
| 消息删除 | DELETE /tasks/{id}/messages/{msgId} | DELETE /session/{id}/message/{msgId}/part/{partId} |
| 消息结构 | 简单的 Message 对象 | Message + Parts 结构(更细粒度) |

### 2.3 上下文管理

| 维度 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 上下文压缩 | POST /tasks/{id}/condense | 自动触发(SessionCompaction) |
| 上下文溢出检测 | 手动触发 | 自动检测(isOverflow) |
| 压缩策略 | 用户主动 | AI 自动生成摘要 + Prune 旧输出 |
| 压缩后继续 | 需要重新发送消息 | 自动创建 "Continue" 消息 |

### 2.4 分支与历史

| 维度 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 分支支持 | 无 | 支持(fork) |
| 父子关系 | 无 | parentID 字段 |
| 历史查看 | 通过消息列表 | GET /session/{id}/children |
| 回滚 | 无 | 支持(revert 字段 + snapshot) |

---

## 3. 功能对比

### 3.1 任务组织功能

| 功能 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 收藏 | ✅ favorite 字段 | ❌ 无 |
| 搜索 | ✅ search 参数 | ✅ search 参数 |
| 排序 | ✅ 多种排序(newest/oldest/mostExpensive/mostTokens) | ❌ 仅按更新时间 |
| 分页 | ✅ page + pageSize | ✅ limit 参数 |
| 工作区过滤 | ✅ workspace=current/all | ✅ directory 参数 |
| 批量删除 | ✅ POST /tasks/batch-delete | ❌ 无 |

### 3.2 导出与分享

| 功能 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 导出 | ✅ POST /tasks/{id}/export (markdown/json) | ❌ 无直接导出 |
| 分享 | ✅ POST /tasks/{id}/share (public/private/unlisted) | ✅ POST /session/{id}/share |
| 分享链接 | ✅ shareUrl + shareId | ✅ share.url |
| 取消分享 | ❌ 无 | ✅ DELETE /session/{id}/share |

### 3.3 权限管理

| 功能 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 权限规则 | ❌ 无内置权限 | ✅ permission 字段(Ruleset) |
| 权限请求 | ❌ 无 | ✅ PermissionNext.ask() |
| 权限响应 | ❌ 无 | ✅ POST /permission/{id}/respond |
| 规则评估 | ❌ 无 | ✅ allow/deny/ask 三种动作 |

### 3.4 高级功能

| 功能 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| Checkpoint | ✅ GET /tasks/{id}/checkpoints | ❌ 无独立 Checkpoint(通过 snapshot) |
| Diff 查看 | ✅ GET /tasks/{id}/checkpoints/{cpId}/diff | ✅ GET /session/{id}/diff |
| 恢复/回滚 | ✅ POST /tasks/{id}/checkpoints/{cpId}/restore | ✅ revert 字段 |
| Todo 列表 | ❌ 无 | ✅ GET /session/{id}/todo |
| 初始化 | ❌ 无 | ✅ POST /session/{id}/init (生成 AGENTS.md) |
| Fork | ❌ 无 | ✅ POST /session/{id}/fork |
| 摘要生成 | ❌ 无 | ✅ POST /session/{id}/summarize |

### 3.5 统计与监控

| 功能 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| Token 统计 | ✅ tokenUsage 字段 | ✅ 通过 Message.tokens 统计 |
| 成本计算 | ✅ cost 字段 | ✅ 通过 Provider 定价计算 |
| 代码变更统计 | ❌ 无 | ✅ summary 字段(additions/deletions/files) |
| 使用统计 | ✅ GET /stats/usage | ❌ 无全局统计接口 |

---

## 4. 接口设计差异

### 4.1 RESTful 风格

**KiloCode Task**:
- 更传统的 RESTful 设计
- 子资源嵌套(如 `/tasks/{id}/messages`)
- 动作端点(如 `/tasks/{id}/cancel`, `/tasks/{id}/export`)

**OpenCode Session**:
- 更扁平的 URL 结构
- 更多使用 HTTP 方法语义(DELETE 取消分享)
- 操作端点更语义化(如 `/session/{id}/prompt`, `/session/{id}/fork`)

### 4.2 响应格式

**KiloCode Task**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**OpenCode Session**:
```json
// 直接返回数组或对象,无包装
[...]
// 或
{ "info": {...}, "parts": [...] }
```

### 4.3 错误处理

**KiloCode Task**:
```json
{
  "code": "TASK_NOT_FOUND",
  "message": "Task not found",
  "details": {}
}
```

**OpenCode Session**:
```json
{
  "error": "NotFoundError",
  "message": "Session not found"
}
```

---

## 5. 架构差异

### 5.1 数据存储

| 维度 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 存储方式 | 未明确(可能是数据库) | SQLite (Storage 模块) |
| 消息存储 | 独立的 Message 表 | MessageV2 + Parts 表 |
| 关系模型 | Task → Messages | Session → Messages → Parts |

### 5.2 事件系统

| 维度 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 事件推送 | WebSocket (/ws/tasks/{id}) | SSE (/global/event) |
| 事件类型 | task.started/message/progress/completed/error | session.created/updated/idle/error + message.part.updated |
| 订阅方式 | 按 Task 订阅 | 全局订阅 + 过滤 |

### 5.3 工具执行

| 维度 | KiloCode Task | OpenCode Session |
|------|---------------|------------------|
| 工具注册 | 未明确 | ToolRegistry + MCP |
| 权限检查 | 无 | PermissionNext |
| 执行上下文 | 简单的参数传递 | Tool.Context (abort/ask/metadata) |

---

## 6. 使用场景差异

### 6.1 KiloCode Task 适用场景

1. **单次任务执行**: 用户提交一个明确的任务,等待完成
2. **任务管理**: 需要查看历史任务、收藏重要任务
3. **成本追踪**: 需要精确统计每个任务的 token 和成本
4. **任务导出**: 需要将任务结果导出为 markdown 或 JSON
5. **批量操作**: 需要批量删除或管理多个任务

### 6.2 OpenCode Session 适用场景

1. **持续对话**: 需要多轮交互,逐步完成复杂任务
2. **分支探索**: 需要在某个节点尝试不同的方案(fork)
3. **权限控制**: 需要细粒度的权限管理(bash/edit/external_directory)
4. **上下文管理**: 需要自动压缩长对话,保持上下文窗口
5. **协作开发**: 需要分享会话链接,让他人查看对话历史
6. **代码审查**: 需要查看每次交互的代码变更(diff)

---

## 7. 优缺点分析

### 7.1 KiloCode Task

**优点**:
- ✅ 简单直观,易于理解
- ✅ 任务状态清晰
- ✅ 支持丰富的任务组织功能(收藏、排序、搜索)
- ✅ 导出功能完善
- ✅ 批量操作支持

**缺点**:
- ❌ 缺乏会话分支能力
- ❌ 无内置权限管理
- ❌ 上下文管理需要手动触发
- ❌ 无法回滚到历史状态
- ❌ 消息编辑功能简单

### 7.2 OpenCode Session

**优点**:
- ✅ 支持复杂的对话分支(fork)
- ✅ 内置权限管理系统
- ✅ 自动上下文压缩
- ✅ 支持回滚和快照
- ✅ 细粒度的消息部分(Parts)管理
- ✅ 代码变更追踪

**缺点**:
- ❌ 缺乏任务组织功能(收藏、排序)
- ❌ 无导出功能
- ❌ 无批量操作
- ❌ 学习曲线较陡峭
- ❌ 状态管理不够直观

---

## 8. 合并建议

### 8.1 保留的核心概念

建议使用 **Session** 作为核心概念,因为:
1. 更符合 AI 对话的本质(持续交互)
2. 支持更复杂的场景(分支、回滚)
3. 内置权限管理更安全

### 8.2 需要补充的功能

从 Task 借鉴以下功能:
1. **收藏功能**: 添加 `favorite` 字段
2. **排序选项**: 支持按成本、token 排序
3. **导出功能**: 添加 `/session/{id}/export` 端点
4. **批量操作**: 添加 `/session/batch-delete` 端点
5. **状态字段**: 添加显式的 `status` 字段

### 8.3 需要简化的功能

从 Session 简化以下功能:
1. **权限管理**: 保留核心功能,简化 API
2. **Parts 结构**: 对外 API 可以简化,内部保持细粒度
3. **事件系统**: 提供按 Session 订阅的选项

---

## 9. 总结

| 维度 | KiloCode Task | OpenCode Session | 推荐 |
|------|---------------|------------------|------|
| 核心理念 | 任务导向 | 对话导向 | Session |
| 易用性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Task |
| 功能完整性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Session |
| 权限管理 | ⭐ | ⭐⭐⭐⭐⭐ | Session |
| 组织能力 | ⭐⭐⭐⭐⭐ | ⭐⭐ | Task |
| 扩展性 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Session |

**最终建议**: 以 **OpenCode Session** 为基础,补充 **KiloCode Task** 的任务管理功能,形成一个既强大又易用的统一接口。
