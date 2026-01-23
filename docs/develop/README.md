# OpenCode 开发指南

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录
cd /Users/pj/code/github/llm.code/opencode
bun install
```

### 2. 开发模式

#### 方式 1: 使用 bun dev (推荐用于调试后端)

```bash
# 添加 bun 到 PATH
export PATH="$HOME/.bun/bin:$PATH"

# 进入目标项目目录
cd ~/code/gba/case/data-anaysis

# 运行开发模式
bun --cwd /Users/pj/code/github/llm.code/opencode/packages/opencode run dev web
```

#### 方式 2: 添加 alias (最方便)

在 `~/.zshrc` 中添加:

```bash
alias opencode-dev="export PATH=\"\$HOME/.bun/bin:\$PATH\" && bun run --cwd /Users/pj/code/github/llm.code/opencode/packages/opencode dev"
```

然后使用:

```bash
# 重新加载配置
source ~/.zshrc

# 进入项目目录
cd ~/code/gba/case/data-anaysis

# 启动 web 开发模式
opencode-dev web
```

### 3. 本地 Web UI 开发

**重要**: `opencode web` 默认会代理到远程服务器 `https://app.opencode.ai`,这会导致 `RangeError: Maximum call stack size exceeded` 等兼容性问题。

要使用本地 Web UI,需要同时运行两个服务:

#### 终端 1: 启动后端 API 服务器

```bash
# 进入你的项目目录
cd ~/code/gba/case/data-anaysis

# 启动后端服务(使用 serve 而不是 web)
opencode-dev serve --port 4096 --hostname 0.0.0.0
```

或使用完整路径:

```bash
cd ~/code/gba/case/data-anaysis
export PATH="$HOME/.bun/bin:$PATH"
bun --cwd /Users/pj/code/github/llm.code/opencode/packages/opencode run dev serve --port 4096 --hostname 0.0.0.0
```

#### 终端 2: 启动前端开发服务器

```bash
# 进入 app 目录
cd /Users/pj/code/github/llm.code/opencode/packages/app

# 启动前端开发服务器
bun run dev
```

#### 访问

浏览器会自动打开,或手动访问:
- 前端: http://localhost:3000
- 后端 API: http://localhost:4096

前端会自动连接到本地后端 API (开发模式下默认连接 `localhost:4096`)

#### 环境变量配置(可选)

如果需要自定义后端地址,在 `packages/app` 目录创建 `.env` 文件:

```bash
cd /Users/pj/code/github/llm.code/opencode/packages/app
cat > .env << 'EOF'
VITE_OPENCODE_SERVER_HOST=localhost
VITE_OPENCODE_SERVER_PORT=4096
EOF
```

#### 便捷启动脚本

创建一个同时启动前后端的脚本:

```bash
# 创建脚本
mkdir -p ~/bin
cat > ~/bin/opencode-dev-web.sh << 'EOF'
#!/bin/bash
PROJECT_DIR="${1:-$(pwd)}"

echo "Starting OpenCode development environment..."
echo "Project directory: $PROJECT_DIR"

# 启动后端
cd "$PROJECT_DIR"
export PATH="$HOME/.bun/bin:$PATH"
bun --cwd /Users/pj/code/github/llm.code/opencode/packages/opencode run dev serve --port 4096 --hostname 0.0.0.0 &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
cd /Users/pj/code/github/llm.code/opencode/packages/app
bun run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both servers"

# 等待中断信号
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait
EOF

chmod +x ~/bin/opencode-dev-web.sh
```

使用:

```bash
# 在当前目录启动
~/bin/opencode-dev-web.sh

# 指定项目目录
~/bin/opencode-dev-web.sh ~/code/gba/case/data-anaysis
```

### 4. 常见问题

#### 问题 1: `RangeError: Maximum call stack size exceeded`

**原因**: 使用 `opencode web` 时,前端代码从远程服务器加载,与本地后端 API 版本不兼容。

**解决方案**: 使用上面的"本地 Web UI 开发"方式,同时运行本地前端和后端。

#### 问题 2: `command not found: bun`

**解决方案**:

```bash
# 添加 bun 到 PATH
export PATH="$HOME/.bun/bin:$PATH"

# 或者永久添加到 ~/.zshrc
echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### 问题 3: 前端无法连接到后端

**检查**:
1. 后端是否在 `http://localhost:4096` 运行
2. 前端配置的 API 端点是否正确
3. CORS 设置是否允许本地开发

### 5. 生产构建

```bash
# 构建前端
cd /Users/pj/code/github/llm.code/opencode/packages/app
bun run build

# 构建后端
cd /Users/pj/code/github/llm.code/opencode/packages/opencode
bun run build
```

### 6. 端口说明

| 服务 | 默认端口 | 说明 |
|------|---------|------|
| 后端 API (opencode serve) | 4096 | HTTP API 服务器 |
| 前端开发服务器 (app) | 3000 | Vite 开发服务器 |
| UI 组件库 (ui) | 3001 | UI 组件开发服务器 |

### 7. 开发工作流

1. **修改后端代码**:
   - 编辑 `packages/opencode/src/**/*.ts`
   - `bun dev` 会自动重启

2. **修改前端代码**:
   - 编辑 `packages/app/src/**/*.tsx`
   - Vite 会热重载

3. **修改 UI 组件**:
   - 编辑 `packages/ui/src/**/*.tsx`
   - 需要在 `packages/app` 中看到效果

### 8. 调试技巧

#### 查看日志

```bash
# 日志文件位置
tail -f ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1)
```

#### 启用详细日志

```bash
opencode-dev web --print-logs --log-level DEBUG
```

#### 浏览器开发者工具

- 打开: `F12` 或 `Cmd+Option+I` (Mac)
- 查看 Console 标签页的错误信息
- 查看 Network 标签页的 API 请求

### 9. 架构说明

```
opencode/
├── packages/
│   ├── opencode/     # 后端 API 服务器 + CLI
│   ├── app/          # Web UI 前端应用
│   ├── ui/           # UI 组件库
│   ├── sdk/          # TypeScript SDK
│   └── ...
```

- **opencode**: 核心后端,提供 HTTP API 和 CLI 命令
- **app**: Web 界面,使用 SolidJS + Vite
- **ui**: 共享的 UI 组件库

### 10. 相关命令

```bash
# 类型检查
bun run typecheck

# 运行测试
bun test

# 格式化代码
bun run format

# Lint 检查
bun run lint
```
