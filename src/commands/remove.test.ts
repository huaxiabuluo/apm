import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock process.exit
vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

// Mock dependencies - 必须在实际导入之前
vi.mock('fs/promises', () => ({
  rm: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  log: {
    warn: vi.fn(),
    step: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  confirm: vi.fn(),
  spinner: vi.fn(),
  isCancel: vi.fn(),
}));

vi.mock('../skills-json', () => ({
  readSkillsJson: vi.fn(),
  removeSkill: vi.fn(),
}));

import * as p from '@clack/prompts';
import { rm } from 'fs/promises';
import { readSkillsJson, removeSkill } from '../skills-json';
import { removeCommand } from './remove';

const mockRm = rm as any;
const mockReadSkillsJson = readSkillsJson as any;
const mockRemoveSkill = removeSkill as any;

// Mock @clack/prompts functions
const mockIntro = p.intro as any;
const mockOutro = p.outro as any;
const mockCancel = p.cancel as any;
const mockLogWarn = p.log.warn as any;
const mockLogStep = p.log.step as any;
const mockLogMessage = p.log.message as any;
const mockLogSuccess = p.log.success as any;
const mockLogError = p.log.error as any;
const mockConfirm = p.confirm as any;
const mockSpinner = p.spinner as any;
const mockIsCancel = p.isCancel as any;

describe('removeCommand', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();

    // 默认 mock 返回值
    mockIntro.mockImplementation(() => {});
    mockOutro.mockImplementation(() => {});
    mockCancel.mockImplementation(() => {});
    mockLogWarn.mockImplementation(() => {});
    mockLogStep.mockImplementation(() => {});
    mockLogMessage.mockImplementation(() => {});
    mockLogSuccess.mockImplementation(() => {});
    mockLogError.mockImplementation(() => {});
    mockRm.mockResolvedValue(undefined);
    mockRemoveSkill.mockResolvedValue(true);

    mockSpinner.mockReturnValue({
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
    });
  });

  describe('当技能不存在时', () => {
    beforeEach(() => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {},
      });
    });

    it('应该显示警告消息', async () => {
      await removeCommand(['nonexistent']);

      expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('No matching skills found'));
      expect(mockOutro).toHaveBeenCalled();
    });

    it('全局模式应该显示全局配置路径', async () => {
      await removeCommand(['nonexistent'], { global: true });

      expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('~/.agents/apm.json'));
    });
  });

  describe('当技能存在时', () => {
    const mockSkills = {
      version: 1,
      skills: {
        'test-skill-1': {
          sourceType: 'npm',
          source: 'package1',
          sourceUrl: 'https://registry.npmjs.org/package1',
          version: '1.0.0',
          skillPath: 'SKILL.md',
        },
        'test-skill-2': {
          sourceType: 'github',
          source: 'owner/repo',
          sourceUrl: 'https://github.com/owner/repo.git',
          mode: 'tag',
          tag: 'v1.0.0',
          skillPath: 'SKILL.md',
        },
      },
    };

    beforeEach(() => {
      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockConfirm.mockResolvedValue(true);
      mockIsCancel.mockReturnValue(false);
    });

    it('应该移除单个技能', async () => {
      await removeCommand(['test-skill-1']);

      expect(mockRemoveSkill).toHaveBeenCalledWith('test-skill-1', false);
      expect(mockRm).toHaveBeenCalled();
      expect(mockLogSuccess).toHaveBeenCalled();
    });

    it('应该移除多个技能', async () => {
      await removeCommand(['test-skill-1', 'test-skill-2']);

      expect(mockRemoveSkill).toHaveBeenCalledTimes(2);
      expect(mockRemoveSkill).toHaveBeenCalledWith('test-skill-1', false);
      expect(mockRemoveSkill).toHaveBeenCalledWith('test-skill-2', false);
    });

    it('应该显示确认提示', async () => {
      await removeCommand(['test-skill-1']);

      expect(mockConfirm).toHaveBeenCalledWith({
        message: expect.stringContaining('Remove 1 skill'),
      });
    });

    it('用户取消时应该停止移除', async () => {
      mockConfirm.mockResolvedValue(false);

      await removeCommand(['test-skill-1']);

      expect(mockRemoveSkill).not.toHaveBeenCalled();
      expect(mockCancel).toHaveBeenCalledWith('Cancelled');
    });

    it('--yes 应该跳过确认', async () => {
      await removeCommand(['test-skill-1'], { yes: true });

      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockRemoveSkill).toHaveBeenCalledWith('test-skill-1', false);
    });

    it('应该删除技能文件', async () => {
      await removeCommand(['test-skill-1']);

      expect(mockRm).toHaveBeenCalledWith(expect.stringContaining('test-skill-1'), { recursive: true, force: true });
    });
  });

  describe('全局模式', () => {
    beforeEach(() => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'package',
            sourceUrl: 'https://registry.npmjs.org/package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      });
      mockConfirm.mockResolvedValue(true);
      mockIsCancel.mockReturnValue(false);
    });

    it('应该从全局配置移除技能', async () => {
      await removeCommand(['test-skill'], { global: true });

      expect(mockReadSkillsJson).toHaveBeenCalledWith(true);
      expect(mockRemoveSkill).toHaveBeenCalledWith('test-skill', true);
    });

    it('应该删除所有已配置 agent 的全局文件', async () => {
      await removeCommand(['test-skill'], { global: true });

      expect(mockRm).toHaveBeenCalledTimes(2);
      expect(mockRm).toHaveBeenCalledWith(expect.stringContaining('.agents/skills/test-skill'), {
        recursive: true,
        force: true,
      });
      expect(mockRm).toHaveBeenCalledWith(expect.stringContaining('.claude/skills/test-skill'), {
        recursive: true,
        force: true,
      });
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'package',
            sourceUrl: 'https://registry.npmjs.org/package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      });
      mockConfirm.mockResolvedValue(true);
      mockIsCancel.mockReturnValue(false);
    });

    it('移除失败时应该显示错误', async () => {
      mockRemoveSkill.mockRejectedValue(new Error('Failed to remove'));

      try {
        await removeCommand(['test-skill']);
      } catch (e) {
        // Expected process.exit to throw
      }

      expect(mockLogError).toHaveBeenCalled();
      expect(mockOutro).toHaveBeenCalledWith(expect.stringContaining('Removal incomplete'));
    });

    it('文件删除失败时应该忽略错误继续', async () => {
      mockRm.mockRejectedValue(new Error('File not found'));

      await removeCommand(['test-skill']);

      // rm 失败但不应该影响整体流程
      expect(mockLogSuccess).toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
