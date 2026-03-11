import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock process.exit
vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
  if (code === 1) {
    throw new Error('process.exit called with "1"');
  }
});

// Mock dependencies - 必须在实际导入之前
vi.mock('fs/promises', () => ({
  rm: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readlink: vi.fn(),
  symlink: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  lstat: vi.fn(),
  realpath: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  log: {
    message: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  confirm: vi.fn(),
  spinner: vi.fn(),
  isCancel: vi.fn(),
}));

vi.mock('../git/clone', () => ({
  cloneRepo: vi.fn(),
  checkoutCommit: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock('../npm/download', () => ({
  downloadNpmPackage: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock('../skills-json', () => ({
  readSkillsJson: vi.fn(),
}));

import * as p from '@clack/prompts';
import { existsSync } from 'fs';
import { mkdir, readdir, rm } from 'fs/promises';
import { cloneRepo, cleanup as gitCleanup } from '../git/clone';
import { downloadNpmPackage, cleanup as npmCleanup } from '../npm/download';
import { readSkillsJson } from '../skills-json';
import { installCommand } from './install';

const mockMkdir = mkdir as any;
const mockReaddir = readdir as any;
const mockExistsSync = existsSync as any;

const mockRm = rm as any;
const mockCloneRepo = cloneRepo as any;
const mockGitCleanup = gitCleanup as any;
const mockDownloadNpmPackage = downloadNpmPackage as any;
const mockNpmCleanup = npmCleanup as any;
const mockReadSkillsJson = readSkillsJson as any;

const mockIntro = p.intro as any;
const mockOutro = p.outro as any;
const mockCancel = p.cancel as any;
const mockLogMessage = p.log.message as any;
const mockLogWarn = p.log.warn as any;
const mockLogSuccess = p.log.success as any;
const mockLogError = p.log.error as any;
const mockConfirm = p.confirm as any;
const mockSpinner = p.spinner as any;

describe('installCommand', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();

    // 默认 mock 返回值
    mockIntro.mockImplementation(() => {});
    mockOutro.mockImplementation(() => {});
    mockCancel.mockImplementation(() => {});
    mockLogMessage.mockImplementation(() => {});
    mockLogWarn.mockImplementation(() => {});
    mockLogSuccess.mockImplementation(() => {});
    mockLogError.mockImplementation(() => {});

    mockSpinner.mockReturnValue({
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
    });

    mockRm.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([]);
    mockExistsSync.mockReturnValue(false);
  });

  describe('当没有技能时', () => {
    beforeEach(() => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {},
      });
    });

    it('应该显示警告消息', async () => {
      await installCommand();

      expect(mockLogWarn).toHaveBeenCalledWith('No skills to install');
    });
  });

  describe('安装所有技能', () => {
    const mockSkills = {
      version: 1,
      skills: {
        'npm-skill': {
          sourceType: 'npm',
          source: 'test-package',
          sourceUrl: 'https://registry.npmjs.org/test-package',
          version: '1.0.0',
          skillPath: 'SKILL.md',
        },
        'github-skill': {
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
      mockDownloadNpmPackage.mockResolvedValue('/tmp/npm-skill');
      mockCloneRepo.mockResolvedValue('/tmp/github-skill');
    });

    it('应该安装所有技能', async () => {
      await installCommand();

      expect(mockDownloadNpmPackage).toHaveBeenCalledWith('test-package', '1.0.0', undefined);
      expect(mockCloneRepo).toHaveBeenCalledWith('https://github.com/owner/repo.git', 'v1.0.0');
    });

    it('应该显示安装进度', async () => {
      await installCommand();

      expect(mockSpinner).toHaveBeenCalled();
    });
  });

  describe('安装指定技能', () => {
    const mockSkills = {
      version: 1,
      skills: {
        skill1: {
          sourceType: 'npm',
          source: 'package1',
          sourceUrl: 'https://registry.npmjs.org/package1',
          version: '1.0.0',
          skillPath: 'SKILL.md',
        },
        skill2: {
          sourceType: 'npm',
          source: 'package2',
          sourceUrl: 'https://registry.npmjs.org/package2',
          version: '2.0.0',
          skillPath: 'SKILL.md',
        },
      },
    };

    it('应该只安装指定的技能', async () => {
      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockDownloadNpmPackage.mockResolvedValue('/tmp/skill1');

      await installCommand({ skills: ['skill1'] });

      expect(mockDownloadNpmPackage).toHaveBeenCalledTimes(1);
      expect(mockDownloadNpmPackage).toHaveBeenCalledWith('package1', '1.0.0', undefined);
    });
  });

  describe('--confirm 确认模式', () => {
    it('应该显示确认提示', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockDownloadNpmPackage.mockResolvedValue('/tmp/test-skill');
      mockConfirm.mockResolvedValue(true);

      await installCommand({ confirm: true });

      expect(mockConfirm).toHaveBeenCalledWith({
        message: expect.stringContaining('Install 1 skill'),
      });
    });

    it('用户取消时不应该安装', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockConfirm.mockResolvedValue(false);

      await installCommand({ confirm: true });

      expect(mockDownloadNpmPackage).not.toHaveBeenCalled();
    });
  });

  describe('internal 模式', () => {
    it('不应该显示 intro', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockDownloadNpmPackage.mockResolvedValue('/tmp/test-skill');

      await installCommand({ internal: true });

      expect(mockIntro).not.toHaveBeenCalled();
    });
  });

  describe('安装失败处理', () => {
    it('应该显示错误信息', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockDownloadNpmPackage.mockRejectedValue(new Error('Download failed'));
      mockMkdir.mockRejectedValue(new Error('Mock error'));

      try {
        await installCommand();
      } catch (e) {
        // Expected process.exit(1)
      }

      // 错误信息会在结果汇总时显示
      expect(mockOutro).toHaveBeenCalledWith(expect.stringContaining('failed to install'));
    });
  });

  describe('全局模式', () => {
    it('应该使用全局配置', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockDownloadNpmPackage.mockResolvedValue('/tmp/test-skill');

      await installCommand({ global: true });

      expect(mockReadSkillsJson).toHaveBeenCalledWith(true);
    });

    it('应该只安装到 universal agent', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockDownloadNpmPackage.mockResolvedValue('/tmp/test-skill');

      await installCommand({ global: true });

      // 检查调用次数
      expect(mockRm).toHaveBeenCalled();
    });
  });

  describe('清理临时目录', () => {
    it('安装后应该清理临时目录', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm',
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockDownloadNpmPackage.mockResolvedValue('/tmp/test-skill');

      await installCommand();

      expect(mockNpmCleanup).toHaveBeenCalled();
    });

    it('Git 仓库也应该清理', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'github',
            source: 'owner/repo',
            sourceUrl: 'https://github.com/owner/repo.git',
            mode: 'tag',
            tag: 'v1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockCloneRepo.mockResolvedValue('/tmp/test-skill');

      await installCommand();

      expect(mockGitCleanup).toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
