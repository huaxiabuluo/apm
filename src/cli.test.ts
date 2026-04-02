import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8'));

vi.mock('@clack/prompts', () => ({
  log: {
    error: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock('picocolors', () => {
  const identity = (value: string) => value;
  return {
    default: {
      bgCyan: identity,
      black: identity,
      bold: identity,
      cyan: identity,
      dim: identity,
      red: identity,
      yellow: identity,
    },
  };
});

vi.mock('./commands/add.js', () => ({
  addCommand: vi.fn(),
}));

vi.mock('./commands/check.js', () => ({
  checkCommand: vi.fn(),
}));

vi.mock('./commands/init.js', () => ({
  initCommand: vi.fn(),
}));

vi.mock('./commands/install.js', () => ({
  installCommand: vi.fn(),
}));

vi.mock('./commands/list.js', () => ({
  listCommand: vi.fn(),
}));

vi.mock('./commands/remove.js', () => ({
  removeCommand: vi.fn(),
}));

vi.mock('./commands/update.js', () => ({
  updateCommand: vi.fn(),
}));

import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import * as p from '@clack/prompts';
import { main } from './cli';

const mockAddCommand = addCommand as ReturnType<typeof vi.fn>;
const mockListCommand = listCommand as ReturnType<typeof vi.fn>;
const mockLogError = p.log.error as ReturnType<typeof vi.fn>;

describe('cli', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();
  });

  it('`apm add --help` 应该显示 add 帮助而不是执行 addCommand', async () => {
    await main(['add', '--help']);

    expect(mockAddCommand).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('apm add'));
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Options can appear before or after the source argument.'),
    );
  });

  it('`apm list --help` 应该显示 list 帮助而不是执行 listCommand', async () => {
    await main(['list', '--help']);

    expect(mockListCommand).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('apm list'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('--verbose'));
  });

  it('`apm --version` 应该只输出版本号', async () => {
    await main(['--version']);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith(pkg.version);
  });

  it('应该允许 add 选项出现在 source 前面', async () => {
    await main(['add', '-g', '--list', 'github:owner/repo']);

    expect(mockAddCommand).toHaveBeenCalledWith('github:owner/repo', {
      global: true,
      list: true,
      skill: [],
    });
  });

  it('应该允许 add 选项出现在 source 后面', async () => {
    await main(['add', 'github:owner/repo', '-g', '--no-save', '--yes']);

    expect(mockAddCommand).toHaveBeenCalledWith('github:owner/repo', {
      global: true,
      noSave: true,
      skill: [],
      yes: true,
    });
  });

  it('`apm help add` 应该显示 add 帮助', async () => {
    await main(['help', 'add']);

    expect(mockAddCommand).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('apm add'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('未知 add flag 应该报错退出', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit called with "${code}"`);
    });

    await expect(main(['add', 'github:owner/repo', '--typo'])).rejects.toThrow('process.exit called with "1"');

    expect(mockAddCommand).not.toHaveBeenCalled();
    expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining('--typo'));

    exitSpy.mockRestore();
  });
});
