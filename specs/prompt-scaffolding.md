# OpenCode Prompt 自定义功能设计文档

> 文档版本: v1.0
> 生成时间: 2026-04-05
> 更新历史: 见本文档末尾

---

## 一、概述

### 1.1 功能目标

提供 workspace 级别的 prompt 高度自定义能力，允许用户覆盖所有内置 prompt，同时保持向后兼容。

### 1.2 核心特性

| 特性                 | 说明                                   |
| -------------------- | -------------------------------------- |
| **优先级机制**       | workspace 自定义文件优先于内置         |
| **自动 Scaffolding** | 进入 workspace 时自动生成 prompt 模板  |
| **命名规范**         | `category.name` 格式（如 `tool.read`） |
| **模板变量**         | 支持 `${var}` 占位符动态替换           |

---

## 二、Prompt 命名规范

### 2.1 命名格式

```
{category}.{name}
```

- `category`: 类别（system/agent/tool/command）
- `name`: 名称，使用 `.` 分隔多级
- 对应文件路径: `{category}/{name}.txt`

### 2.2 命名映射表

| 命名                              | 类别    | 文件路径                              |
| --------------------------------- | ------- | ------------------------------------- |
| `system.anthropic`                | system  | `system/anthropic.txt`                |
| `system.gpt`                      | system  | `system/gpt.txt`                      |
| `system.gemini`                   | system  | `system/gemini.txt`                   |
| `system.kimi`                     | system  | `system/kimi.txt`                     |
| `system.beast`                    | system  | `system/beast.txt`                    |
| `system.codex`                    | system  | `system/codex.txt`                    |
| `system.trinity`                  | system  | `system/trinity.txt`                  |
| `system.default`                  | system  | `system/default.txt`                  |
| `system.plan`                     | system  | `system/plan.txt`                     |
| `system.plan-mode`                | system  | `system/plan-mode.txt`                |
| `system.build-switch`             | system  | `system/build-switch.txt`             |
| `system.max-steps`                | system  | `system/max-steps.txt`                |
| `system.system-environment`       | system  | `system/system-environment.txt`       |
| `system.system-skills`            | system  | `system/system-skills.txt`            |
| `system.structured-output-system` | system  | `system/structured-output-system.txt` |
| `agent.explore`                   | agent   | `agent/explore.txt`                   |
| `agent.compaction`                | agent   | `agent/compaction.txt`                |
| `agent.summary`                   | agent   | `agent/summary.txt`                   |
| `agent.title`                     | agent   | `agent/title.txt`                     |
| `agent.generate`                  | agent   | `agent/generate.txt`                  |
| `tool.bash`                       | tool    | `tool/bash.txt`                       |
| `tool.read`                       | tool    | `tool/read.txt`                       |
| `tool.edit`                       | tool    | `tool/edit.txt`                       |
| `tool.write`                      | tool    | `tool/write.txt`                      |
| `tool.glob`                       | tool    | `tool/glob.txt`                       |
| `tool.grep`                       | tool    | `tool/grep.txt`                       |
| `tool.task`                       | tool    | `tool/task.txt`                       |
| `tool.webfetch`                   | tool    | `tool/webfetch.txt`                   |
| `tool.websearch`                  | tool    | `tool/websearch.txt`                  |
| `tool.question`                   | tool    | `tool/question.txt`                   |
| `tool.todowrite`                  | tool    | `tool/todowrite.txt`                  |
| `tool.batch`                      | tool    | `tool/batch.txt`                      |
| `tool.ls`                         | tool    | `tool/ls.txt`                         |
| `tool.lsp`                        | tool    | `tool/lsp.txt`                        |
| `tool.multiedit`                  | tool    | `tool/multiedit.txt`                  |
| `tool.codesearch`                 | tool    | `tool/codesearch.txt`                 |
| `tool.apply_patch`                | tool    | `tool/apply_patch.txt`                |
| `tool.plan-exit`                  | tool    | `tool/plan-exit.txt`                  |
| `tool.structured-output`          | tool    | `tool/structured-output.txt`          |
| `command.initialize`              | command | `command/initialize.txt`              |
| `command.review`                  | command | `command/review.txt`                  |

**总计: 41 个 prompts**

---

## 三、加载优先级

### 3.1 优先级（从高到低）

```
1. Workspace Prompt 文件
   └── {workspace}/.opencode/prompts/{category}/{name}.txt

2. Config 配置
   └── opencode.json 中的 agent.prompt / command.template

3. Skill 内容
   └── SKILL.md 文件

4. MCP prompts
   └── MCP server 提供

5. 内置静态文件（最低优先级）
   └── src/**/*.txt
```

### 3.2 Workspace 目录结构

```
{workspace}/
└── .opencode/
    └── prompts/
        ├── system/
        │   ├── anthropic.txt
        │   ├── gpt.txt
        │   ├── gemini.txt
        │   ├── kimi.txt
        │   ├── beast.txt
        │   ├── codex.txt
        │   ├── trinity.txt
        │   ├── default.txt
        │   ├── plan.txt
        │   ├── plan-mode.txt
        │   ├── build-switch.txt
        │   ├── max-steps.txt
        │   ├── system-environment.txt
        │   ├── system-skills.txt
        │   └── structured-output-system.txt
        ├── agent/
        │   ├── explore.txt
        │   ├── compaction.txt
        │   ├── summary.txt
        │   ├── title.txt
        │   └── generate.txt
        ├── tool/
        │   ├── bash.txt
        │   ├── read.txt
        │   ├── edit.txt
        │   ├── write.txt
        │   ├── glob.txt
        │   ├── grep.txt
        │   ├── task.txt
        │   ├── webfetch.txt
        │   ├── websearch.txt
        │   ├── question.txt
        │   ├── todowrite.txt
        │   ├── batch.txt
        │   ├── ls.txt
        │   ├── lsp.txt
        │   ├── multiedit.txt
        │   ├── codesearch.txt
        │   ├── apply_patch.txt
        │   ├── plan-exit.txt
        │   └── structured-output.txt
        └── command/
            ├── initialize.txt
            └── review.txt
```

---

## 四、API 参考

### 4.1 PromptLoader

```typescript
// 同步获取（需先调用 preload）
PromptLoader.get(name: string): string

// 异步加载
PromptLoader.load(name: string): Promise<string>

// 带变量替换的异步加载
PromptLoader.loadWithVars(name: string, vars: Record<string, string>): Promise<string>

// 预加载所有 prompts 到缓存
PromptLoader.preload(): Promise<void>

// 检查 workspace 是否有自定义
PromptLoader.exists(name: string): Promise<boolean>

// 获取内置内容（不经过 workspace 覆盖）
PromptLoader.getBuiltIn(name: string): string
```

### 4.2 使用示例

```typescript
// 加载 tool description
const desc = PromptLoader.get("tool.read")

// 加载 system prompt（带变量替换）
const env = await PromptLoader.loadWithVars("system.system-environment", {
  model_id: "claude-3",
  directory: "/path/to/dir",
})

// 加载 agent prompt
const prompt = PromptLoader.get("agent.explore")
```

---

## 五、模板变量

### 5.1 system.system-environment

| 变量             | 说明             |
| ---------------- | ---------------- |
| `${model_id}`    | 模型 ID          |
| `${provider_id}` | Provider ID      |
| `${directory}`   | 工作目录         |
| `${worktree}`    | Workspace 根目录 |
| `${is_git_repo}` | 是否为 git 仓库  |
| `${platform}`    | 操作系统平台     |
| `${date}`        | 当前日期         |

### 5.2 system.system-skills

| 变量             | 说明                                  |
| ---------------- | ------------------------------------- |
| `${skills_list}` | 可用技能列表（由 `Skill.fmt()` 生成） |

### 5.3 其他工具模板

| 工具             | 变量                                                                             | 来源                                  |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------- |
| `tool.task`      | `{agents}`                                                                       | 运行时由 `TaskTool` 替换为 agent 列表 |
| `tool.bash`      | `${directory}`, `${os}`, `${shell}`, `${chaining}`, `${maxLines}`, `${maxBytes}` | `BashTool` 替换                       |
| `tool.websearch` | `{{year}}`                                                                       | `WebSearchTool` 替换为当前年份        |

---

## 六、Scaffolding 机制

### 6.1 触发时机

| 时机           | 行为                     |
| -------------- | ------------------------ |
| 创建 Workspace | 生成所有 prompt 模板文件 |
| 进入 Workspace | 检查缺失文件并生成       |

### 6.2 流程

```
1. 检查 .opencode/prompts/.scaffolded marker
2. 如不存在，执行 scaffold()
3. scaffold() 遍历 PromptRegistry.list()
4. 对每个缺失文件，写入内置内容
5. 创建 .scaffolded marker
```

### 6.3 代码

```typescript
// src/prompt/scaffold.ts
export async function scaffold(): Promise<void> {
  const entries = PromptRegistry.list()

  // 创建目录结构
  for (const entry of entries) {
    const dir = path.dirname(entry.workspacePath)
    await mkdir(path.join(promptsDir, dir), { recursive: true })
  }

  // 生成缺失文件
  for (const entry of entries) {
    const filePath = path.join(promptsDir, entry.workspacePath)
    if (!(await fs.exists(filePath))) {
      await Bun.write(filePath, entry.builtIn)
    }
  }

  // 创建 marker
  if (!(await fs.exists(markerPath))) {
    await Bun.write(markerPath, JSON.stringify({ version: 1, scaffoldedAt: new Date().toISOString() }))
  }
}
```

---

## 七、Build Mode Prompt 构造

```
┌─────────────────────────────────────────────────────────────────┐
│                    Build Mode Prompt 构造                        │
│                                                                  │
│  Layer 1: Agent Prompt (最高)                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ input.agent.prompt 或 prompts/agent/{agent}.txt            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
│  Layer 2: Model System Prompt                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ prompts/system/{provider}.txt                              │  │
│  │ 或 system.{provider} (如 system.anthropic, system.gpt)     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
│  Layer 3: 动态内容                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ env: system.system-environment (模板 + 变量替换)            │  │
│  │ skills: system.system-skills (模板 + Skill.fmt 替换)      │  │
│  │ instructions: instruction.system() (来自 config)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
│  Layer 4: 用户 System Prompt                                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ input.user.system                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
│  Layer 5: 结构化输出 (json_schema 模式)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ system.structured-output-system                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                    │
│  Layer 6: Max Steps Warning                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ system.max-steps                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 八、代码位置

### 8.1 核心文件

| 文件                     | 说明                                  |
| ------------------------ | ------------------------------------- |
| `src/prompt/registry.ts` | Prompt 注册表，定义所有 41 个 prompts |
| `src/prompt/loader.ts`   | PromptLoader 实现，优先级加载逻辑     |
| `src/prompt/scaffold.ts` | Scaffolding 机制实现                  |

### 8.2 调用位置

| 文件                    | 函数            | 说明                                                                                             |
| ----------------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `src/session/system.ts` | `provider()`    | 加载 model-specific system prompt                                                                |
| `src/session/system.ts` | `environment()` | 加载 `system.system-environment`                                                                 |
| `src/session/system.ts` | `skills()`      | 加载 `system.system-skills`                                                                      |
| `src/session/prompt.ts` | -               | 加载 `system.plan`, `system.build-switch`, `system.max-steps`, `system.structured-output-system` |
| `src/agent/agent.ts`    | `state()`       | 加载 `agent.explore`, `agent.compaction`, `agent.title`, `agent.summary`, `agent.generate`       |
| `src/tool/*.ts`         | `Tool.define()` | 加载 tool descriptions                                                                           |
| `src/command/index.ts`  | `init()`        | 加载 `command.initialize`, `command.review`                                                      |

---

## 九、注意事项

1. **变量占位符** - `system-environment.txt` 和 `system-skills.txt` 的变量占位符必须保留
2. **preload() 调用** - 启动时必须调用 `PromptLoader.preload()` 以支持同步访问
3. **文件路径** - workspace 中直接覆盖，无 `.template` 扩展名
4. **Scaffold marker** - `.scaffolded` 文件应加入 `.gitignore`

---

## 附录 A: 未使用文件

| 文件                                         | 状态                           |
| -------------------------------------------- | ------------------------------ |
| `tool/plan-enter.txt`                        | 未使用（PlanEnterTool 已注释） |
| `session/prompt/copilot-gpt-5.txt`           | 未使用                         |
| `session/prompt/plan-reminder-anthropic.txt` | 未使用                         |

---

## 修订记录

| 版本 | 日期       | 修改内容                                                          |
| ---- | ---------- | ----------------------------------------------------------------- |
| v1.0 | 2026-04-05 | 初始版本                                                          |
|      |            | - 实现 PromptLoader 优先级加载                                    |
|      |            | - 实现 Scaffold 机制                                              |
|      |            | - 迁移所有 41 个 prompts 到 registry                              |
|      |            | - 支持 `system.system-environment` 和 `system.system-skills` 模板 |
|      |            | - 支持 `tool.structured-output` 工具描述                          |
|      |            | - 采用 `category.name` 命名规范                                   |
