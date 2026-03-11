import { homedir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  getConfiguredAdditionalAgents,
  expandHomeDir,
  getConfiguredAgents,
  resolveAgentSkillsDir,
  toPersistedAgentConfig,
} from '../../src/agents';

describe('agents helpers', () => {
  it('expands global skill directories under the user home', () => {
    expect(expandHomeDir('~/.agents/skills')).toBe(join(homedir(), '.agents', 'skills'));
  });

  it('resolves a global agent skill directory before file operations', () => {
    expect(
      resolveAgentSkillsDir(
        {
          skillsDir: '.agents/skills',
          globalSkillsDir: '~/.claude/skills',
        },
        true
      )
    ).toBe(join(homedir(), '.claude', 'skills'));
  });

  it('keeps an explicit empty additionalAgents configuration', () => {
    expect(getConfiguredAgents([]).map((agent) => agent.name)).toEqual(['universal']);
  });

  it('hydrates known agents with their internal globalSkillsDir', () => {
    const [agent] = getConfiguredAdditionalAgents([
      {
        name: 'openclaw',
        displayName: 'OpenClaw',
        skillsDir: 'skills',
      },
    ]);

    expect(agent!.globalSkillsDir).toBe('~/.openclaw/skills');
    expect(resolveAgentSkillsDir(agent!, true)).toBe(join(homedir(), '.openclaw', 'skills'));
  });

  it('derives a global directory for custom agents from skillsDir', () => {
    const [agent] = getConfiguredAdditionalAgents([
      {
        name: 'custom-agent',
        displayName: 'Custom Agent',
        skillsDir: '.custom/skills',
      },
    ]);

    expect(agent!.globalSkillsDir).toBe(join(homedir(), '.custom/skills'));
    expect(resolveAgentSkillsDir(agent!, true)).toBe(join(homedir(), '.custom/skills'));
  });

  it('strips globalSkillsDir when persisting agent config', () => {
    expect(
      toPersistedAgentConfig({
        name: 'claude-code',
        displayName: 'Claude Code',
        skillsDir: '.claude/skills',
        globalSkillsDir: '~/.claude/skills',
      })
    ).toEqual({
      name: 'claude-code',
      displayName: 'Claude Code',
      skillsDir: '.claude/skills',
    });
  });
});
