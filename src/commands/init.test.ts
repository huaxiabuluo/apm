import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  log: {
    message: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  confirm: vi.fn(),
  multiselect: vi.fn(),
  isCancel: vi.fn(),
}));

vi.mock('../project.js', () => ({
  findProjectRootSync: vi.fn(),
}));

vi.mock('../logo.js', () => ({
  showLogo: vi.fn(),
}));

import * as p from '@clack/prompts';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { findProjectRootSync } from '../project.js';
import { initCommand } from './init';

const mockExistsSync = existsSync as any;
const mockMkdir = mkdir as any;
const mockWriteFile = writeFile as any;
const mockFindProjectRootSync = findProjectRootSync as any;

const mockConfirm = p.confirm as any;
const mockCancel = p.cancel as any;
const mockLogMessage = p.log.message as any;
const mockLogError = p.log.error as any;
const mockLogSuccess = p.log.success as any;
const mockOutro = p.outro as any;
const mockMultiselect = p.multiselect as any;

describe('initCommand', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();

    mockExistsSync.mockReturnValue(false);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockFindProjectRootSync.mockReturnValue('/test/project');
    mockConfirm.mockResolvedValue(true);
    mockCancel.mockImplementation(() => {});
    mockLogMessage.mockImplementation(() => {});
    mockLogError.mockImplementation(() => {});
    mockLogSuccess.mockImplementation(() => {});
    mockOutro.mockImplementation(() => {});
  });

  it('should create apm.json with builtin apm skill pinned to latest', async () => {
    await initCommand({ agents: ['claude-code'] });

    expect(mockMkdir).toHaveBeenCalledWith('/test/project/.agents', { recursive: true });
    expect(mockWriteFile).toHaveBeenCalledTimes(1);

    const [, content] = mockWriteFile.mock.calls[0];
    expect(JSON.parse(content)).toEqual({
      version: 1,
      additionalAgents: [
        {
          name: 'claude-code',
          displayName: 'Claude Code',
          skillsDir: '.claude/skills',
        },
      ],
      skills: {
        apm: {
          source: '@ai-dancer/apm',
          sourceType: 'npm',
          sourceUrl: 'https://registry.npmjs.org/@ai-dancer/apm',
          version: 'latest',
          skillPath: 'skills/apm/SKILL.md',
        },
      },
    });
    expect(mockOutro).toHaveBeenCalledWith(expect.stringContaining('apm install'));
  });

  it('should prompt before overwriting an existing apm.json', async () => {
    mockExistsSync.mockReturnValue(true);
    mockConfirm.mockResolvedValue(false);

    await initCommand({ agents: ['claude-code'] });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('apm.json already exists'),
      })
    );
    expect(mockCancel).toHaveBeenCalledWith('Init cancelled');
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('should persist empty additionalAgents when no agent is selected interactively', async () => {
    mockMultiselect.mockResolvedValue([]);

    await initCommand();

    expect(mockMultiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        required: false,
      })
    );

    expect(mockWriteFile).toHaveBeenCalledTimes(1);

    const [, content] = mockWriteFile.mock.calls[0];
    expect(JSON.parse(content)).toEqual({
      version: 1,
      additionalAgents: [],
      skills: {
        apm: {
          source: '@ai-dancer/apm',
          sourceType: 'npm',
          sourceUrl: 'https://registry.npmjs.org/@ai-dancer/apm',
          version: 'latest',
          skillPath: 'skills/apm/SKILL.md',
        },
      },
    });
  });
});
