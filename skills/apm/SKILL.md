---
name: apm
description: Manages Agent Skills dependencies with add/install/list/remove/check/update/init workflows. Use when adding skills from GitHub, Git, or NPM sources, updating apm.json, or installing skills for Universal, Claude Code, and OpenClaw.
---

# Using APM

## When To Use

Use `apm` for these tasks:

- Add or install skills
- Update `.agents/apm.json`
- Check whether a skill has a newer version
- Install or reinstall skills for Universal, Claude Code, and OpenClaw
- Work with skill packages from GitHub, Git, or NPM sources

## Common Commands

| Command   | Purpose                      | Example                                                        |
| --------- | ---------------------------- | -------------------------------------------------------------- |
| `init`    | Initialize configuration     | `npx @ai-dancer/apm init --agent claude-code --agent openclaw` |
| `add`     | Add and install a skill      | `npx @ai-dancer/apm add github:anthropics/skills`              |
| `install` | Reinstall skills from config | `npx @ai-dancer/apm install --confirm`                         |
| `list`    | Show configured skills       | `npx @ai-dancer/apm list --verbose`                            |
| `check`   | Check for newer versions     | `npx @ai-dancer/apm check my-skill`                            |
| `update`  | Update skill versions        | `npx @ai-dancer/apm update --select`                           |
| `remove`  | Remove a skill               | `npx @ai-dancer/apm remove my-skill --yes`                     |

## Source Formats

| Format                        | Description                 | Example                                             |
| ----------------------------- | --------------------------- | --------------------------------------------------- |
| `github:owner/repo[@version]` | GitHub repository shorthand | `github:vercel-labs/skills@tag:v1.4.4`              |
| `git:<url>[@version]`         | Generic Git repository      | `git:https://github.com/owner/repo.git@branch:main` |
| `npm:<package>[@version]`     | NPM package                 | `npm:@ai-dancer/apm@1.2.3`                          |

Version syntax:

- No version: Git uses the default branch; NPM uses the latest version returned by the registry
- `@tag:<version>`: pin a Git tag
- `@branch:<name>`: track a Git branch
- `@<version>`: specify an NPM version

## Common Workflows

### 1. Initialize

```bash
npx @ai-dancer/apm init
npx @ai-dancer/apm init --agent claude-code --agent openclaw
npx @ai-dancer/apm init -g
```

### 2. Add Skills

```bash
# NPM
npx @ai-dancer/apm add npm:@ai-dancer/apm
npx @ai-dancer/apm add npm:@ai-dancer/apm@1.2.3
npx @ai-dancer/apm add 'npm:@ai-dancer/apm?registry=https://registry.npmmirror.com'

# GitHub
npx @ai-dancer/apm add github:anthropics/skills
npx @ai-dancer/apm add github:vercel-labs/skills@tag:v1.4.4
npx @ai-dancer/apm add github:anthropics/skills@branch:main

# Git
npx @ai-dancer/apm add git:https://github.com/owner/repo.git
npx @ai-dancer/apm add git:https://github.com/owner/repo.git@branch:main
npx @ai-dancer/apm add git:git@github.com:vercel-labs/agent-skills.git

# Multi-skill repository
npx @ai-dancer/apm add github:anthropics/skills --list
npx @ai-dancer/apm add github:anthropics/skills --no-save
npx @ai-dancer/apm add github:anthropics/skills --skill "*"
npx @ai-dancer/apm add github:anthropics/skills --skill frontend-design --skill skill-creator
```

### 3. Install, Check, and Update

```bash
npx @ai-dancer/apm install
npx @ai-dancer/apm install --confirm

npx @ai-dancer/apm check
npx @ai-dancer/apm check my-skill
npx @ai-dancer/apm check -g

npx @ai-dancer/apm update
npx @ai-dancer/apm update --select
npx @ai-dancer/apm update my-skill --no-install
npx @ai-dancer/apm update -g
```

### 4. List and Remove

```bash
npx @ai-dancer/apm list
npx @ai-dancer/apm list -g
npx @ai-dancer/apm list --verbose

npx @ai-dancer/apm remove my-skill
npx @ai-dancer/apm remove my-skill another-skill
npx @ai-dancer/apm remove my-skill --yes
```

## Config And Directories

- Project-mode config file: `.agents/apm.json`
- Global-mode config file: `~/.agents/apm.json`
- Universal primary copy: `.agents/skills`
- Claude Code default directory: `.claude/skills`
- OpenClaw optional directory: `skills/`

Common `apm.json` fields:

- `source` / `sourceType` / `sourceUrl`
- Git fields: `mode`, `tag`, `branch`, `commit`
- NPM fields: `version`, optional `registry`
- `skillPath`
- `additionalAgents`

## Discovery Rules

APM looks for `SKILL.md` in these locations:

- repository root
- `skills/`
- `skills/.curated/`
- `skills/.experimental/`
- `skills/.system/`
- `.agent/skills/`
- `.agents/skills/`
- `.claude/skills/`

## Operating Conventions

- Prefer command formats and examples already present in the README; do not introduce internal-only sources or private-domain examples
- For NPM examples with a custom registry, keep the README’s quoted form
- When config needs to change, update `.agents/apm.json` first, then run `npx @ai-dancer/apm install`
- When the user only wants to see available skills, prefer `npx @ai-dancer/apm add <source> --list`
- When the user wants to install a skill without recording it in `apm.json`, use `npx @ai-dancer/apm add <source> --no-save`
- Explain that `--no-save` installs immediately but is unmanaged afterward: `apm list`, `apm install`, `apm update`, and `apm remove` will not manage that skill until it is added normally
- When the user wants reproducible versions, prefer Git tags and explicit NPM versions
