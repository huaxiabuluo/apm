# APM (Agent Package Management)

面向 AI agent skills 的通用包管理器

## Badges

[![npm version](https://badge.fury.io/js/%40ai-dancer%2Fapm.svg)](https://www.npmjs.com/package/@ai-dancer/apm)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![install-node 20](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## 特性

- **apm.json 版本管理**：精确记录每个技能的来源与版本，便于复现
- **多源支持**：GitHub、Git、NPM（支持私有 registry）
- **版本管理**：支持检查更新（`check`）和更新技能（`update`）
- **多 Agent 安装**：内置支持 `universal`、`claude-code`、`openclaw`
- **Universal 模式兼容**：Amp、Cline、Codex、Cursor、Gemini CLI、GitHub Copilot、Kimi Code CLI、OpenCode 可直接读取 `.agents/skills`
- **共享主副本**：Universal 目录作为主副本，其他 agent 使用符号链接或复制
- **全局模式**：支持将配置与技能安装到用户主目录

## 多 Agent 支持

APM 支持将技能安装到多个 AI 编程 agents。

### 当前内置支持

- **Universal**（`.agents/skills`）：总是包含，作为主副本
- **Claude Code**（`.claude/skills`）：默认附加 agent
- **OpenClaw**（`skills/`）：可通过 `init --agent openclaw` 或编辑 `apm.json` 启用

### 兼容 Universal 模式的工具

下列工具可直接使用 Universal 目录（`.agents/skills`），通常不需要额外的 `additionalAgents` 配置：

- Amp
- Cline
- Codex
- Cursor
- Gemini CLI
- GitHub Copilot
- Kimi Code CLI
- OpenCode

### 配置额外的 Agents

要配置额外的 agents，请编辑 `apm.json` 文件的 `additionalAgents` 字段：

```jsonc
{
  "version": 1,
  "additionalAgents": [
    {
      "name": "claude-code",
      "displayName": "Claude Code",
      "skillsDir": ".claude/skills"
    },
    {
      "name": "custom-agent",
      "displayName": "自定义 Agent",
      "skillsDir": ".custom/skills"
    }
  ],
  "skills": { ... }
}
```

**规则**：

- 如果 `additionalAgents` 字段不存在，默认启用 **Claude Code**
- 如果 `additionalAgents` 是显式空数组 `[]`，则只启用 **Universal**
- 如果 `additionalAgents` 中声明了条目，则以声明内容为准
- Universal (`.agents`) 总是包含，作为主副本
- `skillsDir` 在项目模式下相对项目根目录解析，在全局模式下相对用户主目录解析
- `globalSkillsDir` 只在代码内部使用，不会写入 `apm.json`

**内置 Agents**：

| Agent Name      | 技能目录         | 说明                           |
| --------------- | ---------------- | ------------------------------ |
| **Claude Code** | `.claude/skills` | Anthropic 官方 CLI（默认包含） |
| **OpenClaw**    | `skills/`        | AI 编程助手                    |

**注意**：

- Universal (`.agents/skills`) 是主副本，其他 agents 通过符号链接共享
- 可以通过配置多个 `additionalAgents` 来支持自定义 agent

## 安装模式

APM 支持两种安装模式：

### 项目模式（默认）

技能配置和文件存储在项目根目录：

```
project-root/
├── .agents/           # APM 目录
│   ├── apm.json       # 项目配置
│   └── skills/        # 技能文件
└── .claude/           # Claude Code 符号链接
    └── skills/
```

**使用场景**：项目特定的技能，需要团队协作和版本控制

### 全局模式

技能配置和文件存储在用户主目录：

```
~/.agents/
├── skills/            # 全局技能文件
└── apm.json           # 全局配置
```

**使用场景**：个人常用技能，跨项目共享

**使用方法**：在任意命令后添加 `-g` 或 `--global` 选项

```bash
# 全局添加技能
apm add -g github:anthropics/skills

# 全局安装技能
apm install -g

# 全局列出技能
apm list -g

# 全局移除技能
apm remove -g my-skill

# 全局检查更新
apm check -g

# 全局更新技能
apm update -g
```

## 快速开始

### 安装 APM

```bash
# 使用 npx 直接运行（推荐）
npx @ai-dancer/apm

# 或全局安装
npm install -g @ai-dancer/apm
```

### 初始化配置

```bash
# 交互式初始化（默认启用 Claude Code）
apm init

# 显式指定附加 agents
apm init --agent claude-code
apm init --agent claude-code --agent openclaw

# 初始化全局配置
apm init -g
```

### 添加技能

```bash
# NPM 包
apm add npm:@ai-dancer/apm
apm add npm:@ai-dancer/apm@1.2.3

# NPM 包（使用私有 registry）
apm add 'npm:@ai-dancer/apm?registry=https://registry.example.com'
apm add 'npm:@ai-dancer/apm@1.2.3?registry=https://registry.example.com'

# GitHub 仓库（默认：main 分支最新 commit）
# `github:` 是托管在 GitHub 上的 `git:` 源的缩写形式
apm add github:anthropics/skills

# 生产环境：使用固定 tag
apm add github:vercel-labs/skills@tag:v1.4.4

# 开发环境：使用特定分支
apm add github:anthropics/skills@branch:main

# 通用 Git 仓库
apm add git:https://github.com/owner/repo.git
apm add git:https://github.com/owner/repo.git@branch:main
apm add git:https://github.com/owner/repo.git@tag:v1.0.0
apm add git:git@github.com:vercel-labs/agent-skills.git
apm add git:git@github.com:vercel-labs/agent-skills.git@branch:main

# 只列出可用技能，不安装
apm add github:anthropics/skills --list

# 安装技能但不写入 apm.json
apm add github:anthropics/skills --no-save

# 指定安装全部或部分技能
apm add github:anthropics/skills --skill "*"
apm add github:anthropics/skills --skill frontend-design --skill skill-creator
```

### 检查与更新

```bash
apm check

apm check my-skill
apm check -g

apm update
apm update --select
apm update my-skill --no-install
apm update -g
```

### 常用命令

| 命令                                                        | 说明                             |
| ----------------------------------------------------------- | -------------------------------- |
| `apm init [-g] [--agent <name>...]`                         | 初始化项目或全局配置             |
| `apm add <source> [options]`                                | 添加技能到 `apm.json` 并自动安装（`--no-save` 仅安装不落盘） |
| `apm install [-g] [--confirm]`                              | 重新安装 `apm.json` 中的技能     |
| `apm list [-g] [--verbose]`                                 | 列出已配置技能和安装状态         |
| `apm remove <skill-name>... [-g] [--yes]`                   | 移除技能配置和已安装文件         |
| `apm check [skill-name...] [-g]`                            | 检查更新                         |
| `apm update [skill-name...] [-g] [--select] [--no-install]` | 更新技能                         |
| `apm help` / `apm version`                                  | 查看帮助或版本                   |

## apm.json 配置

`apm.json` 是配置文件，记录所有技能包的版本信息：

- **项目模式**：位于 `project-root/.agents/apm.json`
- **全局模式**：位于 `~/.agents/apm.json`

```jsonc
{
  "version": 1,
  "additionalAgents": [
    {
      "name": "claude-code",
      "displayName": "Claude Code",
      "skillsDir": ".claude/skills"
    }
  ],
  "skills": {
    "find-skills": {
      "source": "anthropics/skills",
      "sourceType": "github",
      "sourceUrl": "https://github.com/anthropics/skills.git",
      "mode": "tag",
      "tag": "v1.0.0",
      "skillPath": "skills/frontend-design/SKILL.md"
    },
    "my-skill-dev": {
      "source": "owner/repo",
      "sourceType": "github",
      "sourceUrl": "https://github.com/owner/repo.git",
      "mode": "branch",
      "branch": "main",
      "commit": "b304a4188c71877e54373d72109be034d455953b",
      "skillPath": "skills/my-skill/SKILL.md"
    },
    "my-npm-skill": {
      "source": "@ai-dancer/apm",
      "sourceType": "npm",
      "sourceUrl": "https://registry.npmjs.org/@ai-dancer/apm",
      "version": "1.2.3",
      "skillPath": "SKILL.md"
    },
    "my-private-skill": {
      "source": "@company/skills",
      "sourceType": "npm",
      "sourceUrl": "https://registry.example.com/@company/skills",
      "version": "1.0.0",
      "skillPath": "SKILL.md",
      "registry": "https://registry.example.com"
    }
  }
}
```

### 字段说明

| 字段                             | 类型   | 说明                                                                   |
| -------------------------------- | ------ | ---------------------------------------------------------------------- |
| `version`                        | number | 配置文件版本号（固定为 1）                                             |
| `additionalAgents`               | array  | 额外的 agents 配置（可选）                                             |
| `additionalAgents[].name`        | string | Agent 唯一标识（如 `claude-code`）                                     |
| `additionalAgents[].displayName` | string | Agent 显示名称                                                         |
| `additionalAgents[].skillsDir`   | string | Agent 技能目录路径；项目模式下相对项目根目录，全局模式下相对用户主目录 |
| `skills`                         | object | 技能列表                                                               |
| `skills.<name>.source`           | string | 源标识符                                                               |
| `skills.<name>.sourceType`       | string | 当前支持的源类型：`github`、`git`、`npm`                               |
| `skills.<name>.sourceUrl`        | string | 完整的源 URL                                                           |
| `skills.<name>.mode`             | string | Git 版本类型：`tag`、`branch`                                          |
| `skills.<name>.tag`              | string | Git tag（当 mode 为 tag 时使用）                                       |
| `skills.<name>.branch`           | string | Git 分支名（当 mode 为 branch 时使用）                                 |
| `skills.<name>.commit`           | string | Git commit hash（当 mode 为 branch 时使用）                            |
| `skills.<name>.version`          | string | NPM 包版本号                                                           |
| `skills.<name>.skillPath`        | string | SKILL.md 相对于仓库根目录的路径                                        |
| `skills.<name>.registry`         | string | NPM registry 地址（可选，仅用于 NPM 类型）                             |

## 目录结构

### 默认结构（Universal + Claude Code）

```
project-root/
├── .agents/                          # APM 目录
│   ├── apm.json                      # 项目配置文件
│   └── skills/                       # Universal 技能目录（主副本）
│       └── find-skills/              # 复制的技能文件
│           └── SKILL.md
└── .claude/                          # Claude Code 目录（符号链接）
    └── skills/                       # 技能包软链目录
        └── find-skills -> ../../.agents/skills/find-skills
```

启用其他 agent 后，会在对应 `skillsDir` 下创建符号链接；如果符号链接失败，则回退为复制目录。例如 OpenClaw：

```
project-root/
└── skills/                           # OpenClaw（符号链接或复制目录）
    └── find-skills -> ../.agents/skills/find-skills
```

> **注意**：当前版本没有全局缓存。技能文件直接安装在项目目录中。

## 技能包结构

一个标准的技能包仓库结构：

```
owner/skills-repo/
├── skills/                           # 技能目录
│   └── find-skills/
│       └── SKILL.md                  # [核心] 技能定义文件
├── README.md                         # 说明文档
└── package.json                      # 依赖声明（可选，用于 NPM 包）
```

技能发现逻辑会自动搜索以下目录：

- 仓库根目录
- `skills/`
- `skills/.curated/`
- `skills/.experimental/`
- `skills/.system/`
- `.agent/skills/`
- `.agents/skills/`
- `.claude/skills/`

## 开发

```bash
# 类型检查
npm run type-check

# 测试
npm test

# 构建
npm run build

# 查看 CLI 帮助
node bin/cli.mjs --help
```

## License

MIT

## 贡献

欢迎提交 Pull Request。

## 支持

如有问题或需要帮助，请在 GitHub 上提交 issue。
