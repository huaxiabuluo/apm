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
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
  confirm: vi.fn(),
  spinner: vi.fn(),
  multiselect: vi.fn(),
  isCancel: vi.fn(),
}));

vi.mock('./check', () => ({
  checkSkillVersion: vi.fn(),
}));

vi.mock('./install', () => ({
  installCommand: vi.fn(),
}));

vi.mock('../skills-json', () => ({
  readSkillsJson: vi.fn(),
  writeSkillsJson: vi.fn(),
}));

import * as p from '@clack/prompts';
import { mkdir } from 'fs/promises';
import { readSkillsJson, writeSkillsJson } from '../skills-json';
import { checkSkillVersion } from './check';
import { installCommand } from './install';
import { updateCommand } from './update';

const mockMkdir = mkdir as any;
const mockCheckSkillVersion = checkSkillVersion as any;
const mockInstallCommand = installCommand as any;
const mockReadSkillsJson = readSkillsJson as any;
const mockWriteSkillsJson = writeSkillsJson as any;

const mockIntro = p.intro as any;
const mockOutro = p.outro as any;
const mockCancel = p.cancel as any;
const mockLogMessage = p.log.message as any;
const mockLogWarn = p.log.warn as any;
const mockLogInfo = p.log.info as any;
const mockLogSuccess = p.log.success as any;
const mockLogError = p.log.error as any;
const mockConfirm = p.confirm as any;
const mockSpinner = p.spinner as any;
const mockMultiselect = p.multiselect as any;

describe('updateCommand', () => {
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
    mockLogInfo.mockImplementation(() => {});
    mockLogSuccess.mockImplementation(() => {});
    mockLogError.mockImplementation(() => {});

    mockSpinner.mockReturnValue({
      start: vi.fn().mockReturnThis(),
      stop: vi.fn().mockReturnThis(),
    });

    mockMkdir.mockResolvedValue(undefined);
    mockWriteSkillsJson.mockResolvedValue(undefined);
    mockInstallCommand.mockResolvedValue(undefined);
  });

  describe('当所有技能都是最新时', () => {
    beforeEach(() => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm' as const,
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockCheckSkillVersion.mockResolvedValue({
        name: 'test-skill',
        sourceType: 'npm',
        current: { version: '1.0.0' },
        latest: { version: '1.0.0' },
        hasUpdate: false,
      });
    });

    it('应该显示成功消息', async () => {
      await updateCommand();

      expect(mockLogSuccess).toHaveBeenCalledWith(expect.stringContaining('All skills are up to date'));
    });
  });

  describe('更新所有可更新技能', () => {
    beforeEach(() => {
      const mockSkills = {
        version: 1,
        skills: {
          'npm-skill': {
            sourceType: 'npm' as const,
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
          'github-skill': {
            sourceType: 'github' as const,
            source: 'owner/repo',
            sourceUrl: 'https://github.com/owner/repo.git',
            mode: 'tag' as const,
            tag: 'v1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockCheckSkillVersion.mockImplementation((name: string) => {
        if (name === 'npm-skill') {
          return Promise.resolve({
            name: 'npm-skill',
            sourceType: 'npm',
            current: { version: '1.0.0' },
            latest: { version: '1.1.0' },
            hasUpdate: true,
          });
        }
        return Promise.resolve({
          name: 'github-skill',
          sourceType: 'github',
          current: { version: 'v1.0.0' },
          latest: { version: 'v2.0.0' },
          hasUpdate: true,
        });
      });
      mockConfirm.mockResolvedValue(true);
    });

    it('应该更新所有有更新的技能', async () => {
      await updateCommand();

      expect(mockWriteSkillsJson).toHaveBeenCalledTimes(2);
      expect(mockInstallCommand).toHaveBeenCalled();
    });

    it('应该显示确认提示', async () => {
      await updateCommand();

      expect(mockConfirm).toHaveBeenCalled();
    });
  });

  describe('更新指定技能', () => {
    beforeEach(() => {
      const mockSkills = {
        version: 1,
        skills: {
          skill1: {
            sourceType: 'npm' as const,
            source: 'package1',
            sourceUrl: 'https://registry.npmjs.org/package1',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
          skill2: {
            sourceType: 'npm' as const,
            source: 'package2',
            sourceUrl: 'https://registry.npmjs.org/package2',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockCheckSkillVersion.mockResolvedValue({
        name: 'skill1',
        sourceType: 'npm',
        current: { version: '1.0.0' },
        latest: { version: '1.1.0' },
        hasUpdate: true,
      });
      mockConfirm.mockResolvedValue(true);
    });

    it('应该只更新指定的技能', async () => {
      await updateCommand({ skills: ['skill1'] });

      expect(mockCheckSkillVersion).toHaveBeenCalledTimes(1);
      expect(mockWriteSkillsJson).toHaveBeenCalled();
    });
  });

  describe('--select 交互模式', () => {
    beforeEach(() => {
      const mockSkills = {
        version: 1,
        skills: {
          skill1: {
            sourceType: 'npm' as const,
            source: 'package1',
            sourceUrl: 'https://registry.npmjs.org/package1',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
          skill2: {
            sourceType: 'npm' as const,
            source: 'package2',
            sourceUrl: 'https://registry.npmjs.org/package2',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockCheckSkillVersion.mockImplementation((name: string) => ({
        name,
        sourceType: 'npm',
        current: { version: '1.0.0' },
        latest: { version: '1.1.0' },
        hasUpdate: true,
      }));
    });

    it('应该显示多选提示', async () => {
      mockMultiselect.mockResolvedValue(['skill1']);

      await updateCommand({ select: true });

      expect(mockMultiselect).toHaveBeenCalledWith({
        message: expect.stringContaining('Select skills to update'),
        options: expect.arrayContaining([
          expect.objectContaining({
            value: '__all__',
            label: 'All skills',
          }),
        ]),
        required: false,
      });
    });

    it('branch 技能在多选提示里应该显示短 SHA', async () => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {
          'git-skill': {
            sourceType: 'github' as const,
            source: 'owner/repo',
            sourceUrl: 'https://github.com/owner/repo.git',
            mode: 'branch' as const,
            branch: 'main',
            commit: 'abc1234567890def',
            skillPath: 'SKILL.md',
          },
        },
      });
      mockCheckSkillVersion.mockResolvedValue({
        name: 'git-skill',
        sourceType: 'github',
        current: { version: 'abc1234', extra: 'main' },
        latest: { version: 'def9876543210abc', extra: 'main' },
        hasUpdate: true,
      });
      mockMultiselect.mockResolvedValue(['git-skill']);
      mockConfirm.mockResolvedValue(true);

      await updateCommand({ select: true });

      expect(mockMultiselect).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              value: 'git-skill',
              hint: expect.stringContaining('def9876'),
            }),
          ]),
        }),
      );
      expect(mockMultiselect).not.toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              value: 'git-skill',
              hint: expect.stringContaining('def9876543210abc'),
            }),
          ]),
        }),
      );
    });

    it('选择"全选"应该更新所有技能', async () => {
      mockMultiselect.mockResolvedValue(['__all__']);
      mockConfirm.mockResolvedValue(true);

      await updateCommand({ select: true });

      expect(mockWriteSkillsJson).toHaveBeenCalledTimes(2);
    });

    it('用户取消时不应该更新', async () => {
      mockMultiselect.mockResolvedValue([]);

      await updateCommand({ select: true });

      expect(mockCancel).toHaveBeenCalled();
      expect(mockWriteSkillsJson).not.toHaveBeenCalled();
    });
  });

  describe('--no-install 跳过安装', () => {
    beforeEach(() => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm' as const,
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockCheckSkillVersion.mockResolvedValue({
        name: 'test-skill',
        sourceType: 'npm',
        current: { version: '1.0.0' },
        latest: { version: '1.1.0' },
        hasUpdate: true,
      });
      mockConfirm.mockResolvedValue(true);
    });

    it('应该只更新 apm.json 不安装', async () => {
      await updateCommand({ noInstall: true });

      expect(mockWriteSkillsJson).toHaveBeenCalled();
      expect(mockInstallCommand).not.toHaveBeenCalled();
      expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('Skipped installation'));
    });
  });

  describe('全局模式', () => {
    it('应该使用全局配置', async () => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {},
      });

      await updateCommand({ global: true });

      expect(mockReadSkillsJson).toHaveBeenCalledWith(true);
    });
  });

  describe('更新失败处理', () => {
    beforeEach(() => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'npm' as const,
            source: 'test-package',
            sourceUrl: 'https://registry.npmjs.org/test-package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockCheckSkillVersion.mockResolvedValue({
        name: 'test-skill',
        sourceType: 'npm',
        current: { version: '1.0.0' },
        latest: { version: '1.1.0' },
        hasUpdate: true,
      });
      mockConfirm.mockResolvedValue(true);
    });

    it('应该显示错误信息', async () => {
      mockWriteSkillsJson.mockRejectedValue(new Error('Write failed'));

      try {
        await updateCommand();
      } catch (e) {
        // Expected process.exit(1)
      }

      // 错误信息会在结果汇总时显示
      expect(mockOutro).toHaveBeenCalledWith(expect.stringContaining('failed to update'));
    });
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
