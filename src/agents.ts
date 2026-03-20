/**
 * 预定义的 Agents 列表
 * 简化版本：只支持 universal、claude-code、openclaw 三个类型
 */

import { homedir } from 'os';
import { isAbsolute, join } from 'path';
import type { AgentConfigEntry } from './types.js';

/**
 * 支持 Universal 模式的 Agents 列表
 * 这些 agents 使用 .agents/skills 目录，不需要创建符号链接
 */
export const UNIVERSAL_COMPATIBLE_AGENTS: AgentConfigEntry[] = [
  {
    name: 'universal',
    displayName: 'Universal (.agents/skills)',
    skillsDir: '.agents/skills',
    globalSkillsDir: '~/.agents/skills',
  },
];

/**
 * 预定义的 Agents 列表
 * 这些 agents 使用各自独立的 skills 目录
 */
export const PREDEFINED_AGENTS: AgentConfigEntry[] = [
  {
    name: 'claude-code',
    displayName: 'Claude Code',
    skillsDir: '.claude/skills',
    globalSkillsDir: '~/.claude/skills',
  },
  {
    name: 'openclaw',
    displayName: 'OpenClaw',
    skillsDir: 'skills',
    globalSkillsDir: '~/.openclaw/skills',
  },
];

/**
 * 获取所有可用的 agents（包括 Universal）
 */
export function getAllAgents(): AgentConfigEntry[] {
  return [...UNIVERSAL_COMPATIBLE_AGENTS, ...PREDEFINED_AGENTS];
}

/**
 * 获取默认的 additional agents（Claude Code）
 */
export function getDefaultAdditionalAgents(): AgentConfigEntry[] {
  return [
    {
      name: 'claude-code',
      displayName: 'Claude Code',
      skillsDir: '.claude/skills',
      globalSkillsDir: '~/.claude/skills',
    },
  ];
}

/**
 * 获取配置生效后的 additional agents
 */
export function getConfiguredAdditionalAgents(additionalAgents?: AgentConfigEntry[]): AgentConfigEntry[] {
  return (additionalAgents ?? getDefaultAdditionalAgents()).map(hydrateAgentConfig);
}

/**
 * 获取当前配置下全部 agents（包含 universal）
 */
export function getConfiguredAgents(additionalAgents?: AgentConfigEntry[]): AgentConfigEntry[] {
  return [UNIVERSAL_COMPATIBLE_AGENTS[0]!, ...getConfiguredAdditionalAgents(additionalAgents)];
}

/**
 * 获取当前配置下全部 agents 的映射
 */
export function getConfiguredAgentMap(additionalAgents?: AgentConfigEntry[]): Record<string, AgentConfigEntry> {
  const agents = getConfiguredAgents(additionalAgents);
  return Object.fromEntries(agents.map((agent) => [agent.name, agent]));
}

/**
 * 展开路径中的用户主目录
 */
export function expandHomeDir(path: string): string {
  if (path === '~') {
    return homedir();
  }

  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }

  return path;
}

/**
 * 根据 skillsDir 推导全局技能目录
 */
export function deriveGlobalSkillsDir(skillsDir: string): string {
  if (skillsDir === '~' || skillsDir.startsWith('~/')) {
    return expandHomeDir(skillsDir);
  }

  if (isAbsolute(skillsDir)) {
    return skillsDir;
  }

  return join(homedir(), skillsDir);
}

/**
 * 将持久化配置补全为运行时配置
 */
export function hydrateAgentConfig(agent: AgentConfigEntry): AgentConfigEntry {
  const predefined = getAgentByName(agent.name);

  return {
    ...agent,
    globalSkillsDir: agent.globalSkillsDir ?? predefined?.globalSkillsDir ?? deriveGlobalSkillsDir(agent.skillsDir),
  };
}

/**
 * 生成写入 apm.json 的 agent 配置
 */
export function toPersistedAgentConfig(agent: AgentConfigEntry): Omit<AgentConfigEntry, 'globalSkillsDir'> {
  return {
    name: agent.name,
    displayName: agent.displayName,
    skillsDir: agent.skillsDir,
  };
}

/**
 * 解析 agent 的实际技能目录
 */
export function resolveAgentSkillsDir(
  agent: Pick<AgentConfigEntry, 'skillsDir' | 'globalSkillsDir'>,
  global = false,
): string {
  return global
    ? agent.globalSkillsDir
      ? expandHomeDir(agent.globalSkillsDir)
      : deriveGlobalSkillsDir(agent.skillsDir)
    : agent.skillsDir;
}

/**
 * 根据 agent name 获取 agent 配置
 */
export function getAgentByName(name: string): AgentConfigEntry | undefined {
  // 先在 UNIVERSAL_COMPATIBLE_AGENTS 中查找
  const universalAgent = UNIVERSAL_COMPATIBLE_AGENTS.find((agent) => agent.name === name);
  if (universalAgent) {
    return universalAgent;
  }
  // 再在 PREDEFINED_AGENTS 中查找
  return PREDEFINED_AGENTS.find((agent) => agent.name === name);
}

/**
 * 根据 agent names 获取 agent 配置列表
 */
export function getAgentsByNames(names: string[]): AgentConfigEntry[] {
  const agents: AgentConfigEntry[] = [];
  for (const name of names) {
    const agent = getAgentByName(name);
    if (agent) {
      agents.push(agent);
    }
  }
  return agents;
}
