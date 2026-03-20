# APM (Agent Package Management)

Universal package manager for AI agent skills

English | [简体中文](./docs/README.zh.md)

## Badges

[![npm version](https://badge.fury.io/js/%40ai-dancer%2Fapm.svg)](https://www.npmjs.com/package/@ai-dancer/apm)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![install-node 20](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

## Features

- **apm.json versioning**: records each skill source and version for reproducible installs
- **Multiple source types**: GitHub, Git, and NPM, including private registries
- **Version management**: supports update checks with `check` and upgrades with `update`
- **Multi-agent installation**: built-in support for `universal`, `claude-code`, and `openclaw`
- **Universal mode compatibility**: Amp, Cline, Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, and OpenCode can read `.agents/skills` directly
- **Shared primary copy**: the Universal directory is the primary copy; other agents use symlinks or directory copies
- **Global mode**: supports installing config and skills under the user home directory

## Multi-Agent Support

APM can install skills for multiple AI coding agents.

### Built-in Support

- **Universal** (`.agents/skills`): always enabled and used as the primary copy
- **Claude Code** (`.claude/skills`): the default additional agent
- **OpenClaw** (`skills/`): can be enabled with `init --agent openclaw` or by editing `apm.json`

### Universal-Compatible Agents

The following tools can use the Universal directory (`.agents/skills`) directly and usually do not need extra `additionalAgents` configuration:

- Amp
- Cline
- Codex
- Cursor
- Gemini CLI
- GitHub Copilot
- Kimi Code CLI
- OpenCode

### Configuring Additional Agents

To configure additional agents, edit the `additionalAgents` field in `apm.json`:

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
      "displayName": "Custom Agent",
      "skillsDir": ".custom/skills"
    }
  ],
  "skills": { ... }
}
```

Rules:

- If `additionalAgents` is absent, APM enables **Claude Code** by default
- If `additionalAgents` is an explicit empty array `[]`, only **Universal** is enabled
- If `additionalAgents` contains entries, those entries are used as-is
- Universal (`.agents`) is always included as the primary copy
- `skillsDir` is resolved relative to the project root in project mode and relative to the user home directory in global mode
- `globalSkillsDir` is internal runtime state and is not written to `apm.json`

Built-in additional agents:

| Agent Name      | Skill Directory  | Notes                              |
| --------------- | ---------------- | ---------------------------------- |
| **Claude Code** | `.claude/skills` | Included by default                |
| **OpenClaw**    | `skills/`        | Optional built-in additional agent |

Notes:

- Universal (`.agents/skills`) is the primary copy
- Other agents share the same skill content through symlinks when possible
- You can define multiple custom agents in `additionalAgents`

## Installation Modes

APM supports two installation modes.

### Project Mode

Skills and configuration are stored inside the project root:

```text
project-root/
├── .agents/
│   ├── apm.json
│   └── skills/
└── .claude/
    └── skills/
```

Use project mode for repository-local skills that should be tracked and shared with the team.

### Global Mode

Skills and configuration are stored under the user home directory:

```text
~/.agents/
├── skills/
└── apm.json
```

Use global mode for personal skills shared across projects.

Add `-g` or `--global` to supported commands:

```bash
apm add -g github:anthropics/skills
apm install -g
apm list -g
apm remove -g my-skill
apm check -g
apm update -g
```

## Quick Start

### Install APM

```bash
npx @ai-dancer/apm

npm install -g @ai-dancer/apm
```

### Initialize Configuration

```bash
# Interactive initialization (defaults to claude-code)
apm init

# Explicit additional agents
apm init --agent claude-code
apm init --agent claude-code --agent openclaw

# Global configuration
apm init -g
```

### Add Skills

```bash
# NPM package
apm add npm:@ai-dancer/apm
apm add npm:@ai-dancer/apm@1.2.3

# NPM package with a custom registry
apm add 'npm:@ai-dancer/apm?registry=https://registry.example.com'
apm add 'npm:@ai-dancer/apm@1.2.3?registry=https://registry.example.com'

# GitHub repository
# `github:` is shorthand for a GitHub-hosted `git:` source
apm add github:anthropics/skills
apm add github:vercel-labs/skills@tag:v1.4.4
apm add github:anthropics/skills@branch:main

# Generic Git repository
apm add git:https://github.com/owner/repo.git
apm add git:https://github.com/owner/repo.git@branch:main
apm add git:https://github.com/owner/repo.git@tag:v1.0.0
apm add git:git@github.com:vercel-labs/agent-skills.git
apm add git:git@github.com:vercel-labs/agent-skills.git@branch:main

# List skills without installing
apm add github:anthropics/skills --list

# Install skills without saving to apm.json
apm add github:anthropics/skills --no-save

# Install all or selected skills from a multi-skill repository
apm add github:anthropics/skills --skill "*"
apm add github:anthropics/skills --skill frontend-design --skill skill-creator
```

### Check and Update

```bash
apm check
apm check my-skill
apm check -g

apm update
apm update --select
apm update my-skill --no-install
apm update -g
```

### Common Commands

| Command                                                     | Description                                          |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `apm init [-g] [--agent <name>...]`                         | Initialize project or global configuration           |
| `apm add <source> [options]`                                | Add skills to `apm.json` and install them (`--no-save` installs only) |
| `apm install [-g] [--confirm]`                              | Reinstall skills from `apm.json`                     |
| `apm list [-g] [--verbose]`                                 | List configured skills and installation status       |
| `apm remove <skill-name>... [-g] [--yes]`                   | Remove skills from config and delete installed files |
| `apm check [skill-name...] [-g]`                            | Check for updates                                    |
| `apm update [skill-name...] [-g] [--select] [--no-install]` | Update skills                                        |
| `apm help` / `apm version`                                  | Show help or version information                     |

## `apm.json`

`apm.json` records configured skills and agent settings.

- **Project mode**: `project-root/.agents/apm.json`
- **Global mode**: `~/.agents/apm.json`

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

### Field Reference

| Field                            | Type   | Description                                                                                                               |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `version`                        | number | Config version, currently always `1`                                                                                      |
| `additionalAgents`               | array  | Optional list of additional agent configs                                                                                 |
| `additionalAgents[].name`        | string | Agent identifier, such as `claude-code`                                                                                   |
| `additionalAgents[].displayName` | string | Human-readable agent name                                                                                                 |
| `additionalAgents[].skillsDir`   | string | Skill directory path; relative to the project root in project mode and relative to the user home directory in global mode |
| `skills`                         | object | Configured skill entries                                                                                                  |
| `skills.<name>.source`           | string | Source identifier                                                                                                         |
| `skills.<name>.sourceType`       | string | Supported source types: `github`, `git`, `npm`                                                                            |
| `skills.<name>.sourceUrl`        | string | Full source URL                                                                                                           |
| `skills.<name>.mode`             | string | Git version mode: `tag` or `branch`                                                                                       |
| `skills.<name>.tag`              | string | Git tag, used when `mode` is `tag`                                                                                        |
| `skills.<name>.branch`           | string | Git branch, used when `mode` is `branch`                                                                                  |
| `skills.<name>.commit`           | string | Git commit hash, used when `mode` is `branch`                                                                             |
| `skills.<name>.version`          | string | NPM package version                                                                                                       |
| `skills.<name>.skillPath`        | string | Path to `SKILL.md` relative to the source root                                                                            |
| `skills.<name>.registry`         | string | Optional NPM registry URL                                                                                                 |

## Directory Layout

### Default Layout (Universal + Claude Code)

```text
project-root/
├── .agents/
│   ├── apm.json
│   └── skills/
│       └── find-skills/
│           └── SKILL.md
└── .claude/
    └── skills/
        └── find-skills -> ../../.agents/skills/find-skills
```

When additional agents are enabled, APM creates symlinks in their `skillsDir`. If symlink creation fails, it falls back to copying the directory. For example, OpenClaw may look like this:

```text
project-root/
└── skills/
    └── find-skills -> ../.agents/skills/find-skills
```

Note: there is currently no global cache layer. Skill files are installed directly into the target directories.

## Skill Package Structure

A typical skill package repository looks like this:

```text
owner/skills-repo/
├── skills/
│   └── find-skills/
│       └── SKILL.md
├── README.md
└── package.json
```

APM automatically searches these locations for skills:

- repository root
- `skills/`
- `skills/.curated/`
- `skills/.experimental/`
- `skills/.system/`
- `.agent/skills/`
- `.agents/skills/`
- `.claude/skills/`

## Development

```bash
npm run type-check
npm test
npm run build
node bin/cli.mjs --help
```

## License

MIT

## Contributing

Contributions are welcome. Please feel free to submit a pull request.

## Support

If you have questions or need help, please open an issue on GitHub.
