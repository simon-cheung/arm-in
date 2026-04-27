# Desktop Build Guide

## Build Commands

### Local Build (with local opencode-cli)

```bash
cd packages/desktop
bun run build:local
```

This builds the frontend and compiles a local opencode-cli binary into the sidecar.

### Tauri Build

```bash
cd packages/desktop
bun run tauri build
```

### Dev Mode

```bash
cd packages/desktop
bun run tauri dev
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` in `packages/desktop/`:

```bash
cp packages/desktop/.env.example packages/desktop/.env.local
```

| Variable              | Default        | Description                                                                         |
| --------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `OPENCODE_APP_NAME`   | `OpenCode`     | Desktop app binary name (also used for post-build copy step)                        |
| `OPENCODE_CLI_NAME`   | `opencode-cli` | CLI binary name (affects sidecar filename, externalBin, Rust compile-time constant) |
| `OPENCODE_ICON_THEME` | `dev`          | Icon theme: `dev` or `beta` (located in `src-tauri/icons/`)                         |

### Tauri Config

- `tauri.conf.json` — base config (dev defaults)
- `tauri.prod.json` — overrides applied during `bun run tauri build`
- `tauri.dev.json` — overrides applied during `bun run tauri dev`

Config fields that can be overridden per environment:

| Field                               | tauri.prod.json                               |
| ----------------------------------- | --------------------------------------------- |
| `productName`                       | ✅                                            |
| `version`                           | ✅                                            |
| `bundle.icon`                       | ✅ (auto-injected from `OPENCODE_ICON_THEME`) |
| `bundle.externalBin`                | ✅ (auto-injected from `OPENCODE_CLI_NAME`)   |
| `bundle.windows.nsis.installerIcon` | ✅ (auto-injected from `OPENCODE_ICON_THEME`) |

### Icon Themes

Available themes under `src-tauri/icons/`:

- `dev/` — default development icons
- `beta/` — alternative icons

Set via `OPENCODE_ICON_THEME=beta` in `.env.local`.

### Custom CLI Name

Set `OPENCODE_CLI_NAME=my-cli` in `.env.local`. This affects:

1. **Sidecar folder**: `src-tauri/sidecars/my-cli-{TARGET}`
2. **externalBin path**: `sidecars/my-cli-{TARGET}`
3. **Rust binary path**: `get_sidecar_path()` uses `env!("OPENCODE_CLI_NAME")`
4. **macOS killall**: `killall my-cli` (debug builds)

## Build Output

- Windows installer: `src-tauri/target/release/bundle/nsis/*.exe`
- macOS app: `src-tauri/target/release/bundle/macos/*.app`
- Linux packages: `src-tauri/target/release/bundle/deb/*.deb`, `src-tauri/target/release/bundle/rpm/*.rpm`

## 路径配置

### 目录结构（XDG Base Directory 规范）

| 平台        | 数据目录                  | 配置目录             | 缓存目录                  |
| ----------- | ------------------------- | -------------------- | ------------------------- |
| **macOS**   | `~/.local/share/opencode` | `~/.config/opencode` | `~/.cache/opencode`       |
| **Linux**   | `~/.local/share/opencode` | `~/.config/opencode` | `~/.cache/opencode`       |
| **Windows** | `%APPDATA%/opencode`      | `%APPDATA%/opencode` | `%LOCALAPPDATA%/opencode` |

定义位置：`packages/opencode/src/global/index.ts:9-12`

### 托管配置目录（企业/管理员）

| 平台    | 路径                                    |
| ------- | --------------------------------------- |
| macOS   | `/Library/Application Support/opencode` |
| Windows | `%ProgramData%/opencode`                |
| Linux   | `/etc/opencode`                         |

定义位置：`packages/opencode/src/config/config.ts:60-75`

### 数据存储路径

| 类型              | 路径                             |
| ----------------- | -------------------------------- |
| SQLite 数据库     | `Global.Path.data/opencode.db`   |
| 认证信息          | `Global.Path.data/auth.json`     |
| MCP 认证          | `Global.Path.data/mcp-auth.json` |
| JSON Session 存储 | `Global.Path.data/storage/`      |

### 环境变量

#### 路径相关

| 变量                        | 说明                                          |
| --------------------------- | --------------------------------------------- |
| `OPENCODE_CONFIG_DIR`       | 自定义配置目录                                |
| `OPENCODE_CONFIG`           | 自定义配置文件路径                            |
| `OPENCODE_TUI_CONFIG`       | 自定义 TUI 配置文件路径                       |
| `OPENCODE_DB`               | 自定义 SQLite 数据库路径                      |
| `OPENCODE_TEST_HOME`        | 测试用 home 目录（仅影响 `Global.Path.home`） |
| `OPENCODE_PLUGIN_META_FILE` | 自定义插件元数据文件路径                      |
| `XDG_DATA_HOME`             | XDG 数据基准目录                              |
| `XDG_CONFIG_HOME`           | XDG 配置基准目录                              |
| `XDG_CACHE_HOME`            | XDG 缓存基准目录                              |

#### 功能开关

| 变量                                        | 说明                         |
| ------------------------------------------- | ---------------------------- |
| `OPENCODE_DISABLE_PROJECT_CONFIG`           | 禁用项目级 `.opencode/` 配置 |
| `OPENCODE_DISABLE_DEFAULT_PLUGINS`          | 禁用默认插件                 |
| `OPENCODE_DISABLE_AUTOUPDATE`               | 禁用自动更新                 |
| `OPENCODE_DISABLE_AUTOCOMPACT`              | 禁用数据库自动压缩           |
| `OPENCODE_DISABLE_MODELS_FETCH`             | 禁用模型列表获取             |
| `OPENCODE_DISABLE_LSP_DOWNLOAD`             | 禁用 LSP 下载                |
| `OPENCODE_DISABLE_FILETIME_CHECK`           | 禁用文件时间检查             |
| `OPENCODE_DISABLE_MOUSE`                    | 禁用鼠标支持                 |
| `OPENCODE_DISABLE_TERMINAL_TITLE`           | 禁用终端标题更新             |
| `OPENCODE_DISABLE_CLAUDE_CODE`              | 禁用 Claude Code 兼容模式    |
| `OPENCODE_DISABLE_EMBEDDED_WEB_UI`          | 禁用内置 Web UI              |
| `OPENCODE_DISABLE_CHANNEL_DB`               | 禁用 channel 特定数据库      |
| `OPENCODE_EXPERIMENTAL`                     | 启用实验性功能               |
| `OPENCODE_EXPERIMENTAL_FILEWATCHER`         | 实验性文件监视器             |
| `OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER` | 禁用文件监视器               |
| `OPENCODE_EXPERIMENTAL_LSP_TOOL`            | 实验性 LSP 工具              |
| `OPENCODE_EXPERIMENTAL_PLAN_MODE`           | 实验性计划模式               |
| `OPENCODE_EXPERIMENTAL_WORKSPACES`          | 实验性工作区支持             |
| `OPENCODE_EXPERIMENTAL_MARKDOWN`            | 实验性 Markdown 渲染         |
| `OPENCODE_EXPERIMENTAL_OXFMT`               | 实验性输出格式化             |
| `OPENCODE_ENABLE_EXA`                       | 启用 Exa 搜索                |
| `OPENCODE_ENABLE_QUESTION_TOOL`             | 启用问题工具                 |
| `OPENCODE_ENABLE_EXPERIMENTAL_MODELS`       | 启用实验性模型               |
| `OPENCODE_AUTO_SHARE`                       | 自动分享                     |
| `OPENCODE_AUTO_HEAP_SNAPSHOT`               | 自动堆快照                   |
| `OPENCODE_STRICT_CONFIG_DEPS`               | 严格配置依赖检查             |

#### 服务器相关

| 变量                          | 说明          |
| ----------------------------- | ------------- |
| `OPENCODE_SERVER_PASSWORD`    | 服务器密码    |
| `OPENCODE_SERVER_USERNAME`    | 服务器用户名  |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP 导出端点 |
| `OTEL_EXPORTER_OTLP_HEADERS`  | OTLP 请求头   |

#### 其他

| 变量                                            | 说明                                |
| ----------------------------------------------- | ----------------------------------- |
| `OPENCODE_PERMISSION`                           | 权限配置                            |
| `OPENCODE_GIT_BASH_PATH`                        | Git Bash 路径（Windows）            |
| `OPENCODE_FAKE_VCS`                             | 模拟 VCS 用于测试                   |
| `OPENCODE_MODELS_URL`                           | 自定义模型列表 URL                  |
| `OPENCODE_MODELS_PATH`                          | 自定义模型列表路径                  |
| `OPENCODE_CONFIG_CONTENT`                       | 内联配置内容                        |
| `OPENCODE_CLIENT`                               | 客户端类型（`cli`/`app`/`desktop`） |
| `OPENCODE_PURE`                                 | 纯净模式                            |
| `OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS` | Bash 默认超时（毫秒）               |
| `OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX`        | 输出 token 上限                     |
| `OPENCODE_SHOW_TTFD`                            | 显示首次延迟                        |
| `OPENCODE_ALWAYS_NOTIFY_UPDATE`                 | 总是通知更新                        |
| `OPENCODE_PRUNE`                                | 清理未使用依赖                      |
| `OPENCODE_SKIP_MIGRATIONS`                      | 跳过数据库迁移                      |

定义位置：`packages/opencode/src/flag/flag.ts`

### 完整目录结构

```
~/.local/share/opencode/          (或 %APPDATA%/opencode)
├── opencode.db                   # SQLite 数据库
├── auth.json                     # Provider API keys/tokens
├── mcp-auth.json                 # MCP 认证
├── storage/session/              # JSON 格式 session
└── bin/                          # 下载的二进制文件

~/.config/opencode/
├── opencode.jsonc                # 用户配置
└── tui.json                      # TUI 配置

/etc/opencode/                    # Linux 托管配置
/Library/Application Support/opencode  # macOS 托管配置
%ProgramData%/opencode/           # Windows 托管配置
```
