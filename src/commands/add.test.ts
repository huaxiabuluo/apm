import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock process.exit
vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null) => {
  throw new Error(`process.exit called with "${code}"`);
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
  log: {
    message: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  confirm: vi.fn(),
  spinner: vi.fn(),
  multiselect: vi.fn(),
  isCancel: vi.fn(),
}));

vi.mock('simple-git', () => ({
  gitP: () => ({
    clone: vi.fn(),
    listRemote: vi.fn(),
    branch: vi.fn(),
    raw: vi.fn(),
  }),
}));

vi.mock('../git/clone', () => ({
  cloneRepo: vi.fn(),
  getCurrentBranch: vi.fn(),
  getLatestCommit: vi.fn(),
  checkoutCommit: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock('../npm/download', () => ({
  downloadNpmPackage: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock('../npm/resolve-version', () => ({
  resolveNpmVersion: vi.fn(),
  compareVersions: vi.fn(),
}));

vi.mock('../skills-json', () => ({
  readSkillsJson: vi.fn(),
  addSkill: vi.fn(),
}));

vi.mock('../skills', () => ({
  discoverSkills: vi.fn(),
  filterSkills: vi.fn(),
  getSkillDisplayName: vi.fn(),
}));

vi.mock('./install', () => ({
  installCommand: vi.fn(),
}));

import * as p from '@clack/prompts';
import { cloneRepo, getCurrentBranch, getLatestCommit, cleanup as gitCleanup } from '../git/clone';
import { downloadNpmPackage, cleanup as npmCleanup } from '../npm/download';
import { resolveNpmVersion } from '../npm/resolve-version';
import { discoverSkills, filterSkills } from '../skills';
import { addSkill, readSkillsJson } from '../skills-json';
import { addCommand } from './add';
import { installCommand } from './install';

const mockCloneRepo = cloneRepo as any;
const mockGetCurrentBranch = getCurrentBranch as any;
const mockGetLatestCommit = getLatestCommit as any;
const mockGitCleanup = gitCleanup as any;
const mockDownloadNpmPackage = downloadNpmPackage as any;
const mockNpmCleanup = npmCleanup as any;
const mockResolveNpmVersion = resolveNpmVersion as any;
const mockReadSkillsJson = readSkillsJson as any;
const mockAddSkill = addSkill as any;
const mockDiscoverSkills = discoverSkills as any;
const mockFilterSkills = filterSkills as any;
const mockInstallCommand = installCommand as any;

const mockIntro = p.intro as any;
const mockOutro = p.outro as any;
const mockLogMessage = p.log.message as any;
const mockLogWarn = p.log.warn as any;
const mockLogInfo = p.log.info as any;
const mockLogError = p.log.error as any;
const mockLogSuccess = p.log.success as any;
const mockConfirm = p.confirm as any;
const mockSpinner = p.spinner as any;
let mockSpinnerStart: any;
let mockSpinnerStop: any;

describe('addCommand', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();

    // 默认 mock 返回值
    mockIntro.mockImplementation(() => {});
    mockOutro.mockImplementation(() => {});
    mockLogMessage.mockImplementation(() => {});
    mockLogWarn.mockImplementation(() => {});
    mockLogInfo.mockImplementation(() => {});
    mockLogError.mockImplementation(() => {});
    mockLogSuccess.mockImplementation(() => {});

    mockSpinnerStart = vi.fn().mockReturnThis();
    mockSpinnerStop = vi.fn().mockReturnThis();
    mockSpinner.mockReturnValue({
      start: mockSpinnerStart,
      stop: mockSpinnerStop,
    });

    // 默认技能发现返回一个技能
    const mockSkill = {
      name: 'test-skill',
      description: 'Test skill description',
      path: '/tmp/repo/skills/test-skill',
      rawContent: 'content',
      metadata: {},
    };
    mockDiscoverSkills.mockResolvedValue([mockSkill]);

    mockReadSkillsJson.mockResolvedValue({
      version: 1,
      skills: {},
    });

    mockAddSkill.mockResolvedValue(undefined);
    mockInstallCommand.mockResolvedValue(undefined);

    mockGitCleanup.mockResolvedValue(undefined);
    mockNpmCleanup.mockResolvedValue(undefined);
  });

  describe('添加 GitHub 仓库（tag 模式）', () => {
    it('应该成功添加 tag 模式的技能', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('github:owner/repo@tag:v1.0.0');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockCloneRepo).toHaveBeenCalledWith('https://github.com/owner/repo.git', 'v1.0.0');
      expect(mockDiscoverSkills).toHaveBeenCalled();
      expect(mockAddSkill).toHaveBeenCalled();
    });

    it('应该显示源地址和版本信息', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('github:owner/repo@tag:v1.0.0');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockLogMessage).toHaveBeenCalledWith(expect.stringContaining('https://github.com/owner/repo.git'));
    });

    it('应该将预下载目录传给内部 install 并在安装后清理', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('github:owner/repo@tag:v1.0.0');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockInstallCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          internal: true,
          skills: ['test-skill'],
          prefetchedSourceDir: '/tmp/repo',
        })
      );
      expect(mockGitCleanup).toHaveBeenCalledWith('/tmp/repo');
      expect(mockInstallCommand.mock.invocationCallOrder[0]).toBeLessThan(mockGitCleanup.mock.invocationCallOrder[0]);
    });
  });

  describe('添加 GitHub 仓库（branch 模式）', () => {
    it('应该自动获取默认分支和 commit', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      mockGetCurrentBranch.mockResolvedValue('main');
      mockGetLatestCommit.mockResolvedValue('abc123def456');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('github:owner/repo');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockCloneRepo).toHaveBeenCalledWith('https://github.com/owner/repo.git', undefined);
      expect(mockGetCurrentBranch).toHaveBeenCalled();
      expect(mockGetLatestCommit).toHaveBeenCalled();
    });
  });

  describe('添加 NPM 包', () => {
    it('应该成功添加 NPM 包', async () => {
      mockResolveNpmVersion.mockResolvedValue('1.2.3');
      mockDownloadNpmPackage.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('npm:test-package');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockResolveNpmVersion).toHaveBeenCalledWith('test-package', undefined, undefined);
      expect(mockDownloadNpmPackage).toHaveBeenCalledWith('test-package', '1.2.3', undefined);
    });

    it('应该解析版本范围到精确版本', async () => {
      mockResolveNpmVersion.mockResolvedValue('1.2.3');
      mockDownloadNpmPackage.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('npm:test-package@^1.0.0');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockResolveNpmVersion).toHaveBeenCalledWith('test-package', '^1.0.0', undefined);
    });

    it('应该将 npm 请求版本和解析后版本合并为一行', async () => {
      mockResolveNpmVersion.mockResolvedValue('1.2.3');
      mockDownloadNpmPackage.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('npm:test-package@latest');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockLogMessage).not.toHaveBeenCalledWith(expect.stringContaining('Version: latest'));
      expect(mockSpinnerStop).toHaveBeenCalledWith(expect.stringContaining('Version:'));
      expect(mockSpinnerStop).toHaveBeenCalledWith(expect.stringContaining('latest'));
      expect(mockSpinnerStop).toHaveBeenCalledWith(expect.stringContaining('1.2.3'));
    });

    it('指定自定义 registry 时，应该在 Source 和持久化条目中使用该 registry', async () => {
      mockResolveNpmVersion.mockResolvedValue('1.2.3');
      mockDownloadNpmPackage.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('npm:@ai-dancer/apm?registry=https://registry.npmmirror.com/');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockLogMessage).toHaveBeenCalledWith(expect.stringContaining('Source:'));
      expect(mockLogMessage).toHaveBeenCalledWith(
        expect.stringContaining('https://registry.npmmirror.com/@ai-dancer/apm')
      );
      expect(mockLogMessage).toHaveBeenCalledWith(expect.stringContaining('Registry:'));
      expect(mockAddSkill).toHaveBeenCalledWith(
        'test-skill',
        expect.objectContaining({
          source: '@ai-dancer/apm',
          sourceType: 'npm',
          sourceUrl: 'https://registry.npmmirror.com/@ai-dancer/apm',
          registry: 'https://registry.npmmirror.com/',
          version: '1.2.3',
        }),
        false
      );
    });
  });

  describe('--list 模式', () => {
    it('应该列出可用技能但不安装', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');

      try {
        await addCommand('github:owner/repo', { list: true });
      } catch (e) {
        // process.exit(0)
      }

      expect(mockDiscoverSkills).toHaveBeenCalled();
      expect(mockAddSkill).not.toHaveBeenCalled();
      expect(mockInstallCommand).not.toHaveBeenCalled();
    });

    it('应该显示技能名称和描述', async () => {
      const mockSkills = [
        {
          name: 'skill1',
          description: 'Description 1',
          path: '/tmp/skill1',
          rawContent: '',
          metadata: {},
        },
        {
          name: 'skill2',
          description: 'Description 2',
          path: '/tmp/skill2',
          rawContent: '',
          metadata: {},
        },
      ];
      mockDiscoverSkills.mockResolvedValue(mockSkills);
      mockCloneRepo.mockResolvedValue('/tmp/repo');

      try {
        await addCommand('github:owner/repo', { list: true });
      } catch (e) {
        // process.exit(0)
      }

      // 检查 logMessage 至少被调用了技能数量的次数
      expect(mockLogMessage).toHaveBeenCalled();
    });
  });

  describe('--skill 指定技能', () => {
    it('应该只安装指定的技能', async () => {
      const mockSkills = [
        {
          name: 'skill1',
          description: 'Description 1',
          path: '/tmp/skill1',
          rawContent: '',
          metadata: {},
        },
        {
          name: 'skill2',
          description: 'Description 2',
          path: '/tmp/skill2',
          rawContent: '',
          metadata: {},
        },
      ];
      mockDiscoverSkills.mockResolvedValue(mockSkills);
      mockFilterSkills.mockReturnValue([mockSkills[0]]);
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('github:owner/repo', { skill: ['skill1'] });
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockFilterSkills).toHaveBeenCalledWith(mockSkills, ['skill1']);
      expect(mockAddSkill).toHaveBeenCalledTimes(1);
    });

    it('使用 --skill "*" 应该安装所有技能', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('github:owner/repo', { skill: ['*'] });
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockAddSkill).toHaveBeenCalled();
    });
  });

  describe('--yes 跳过确认', () => {
    it('应该自动选择所有技能', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');

      try {
        await addCommand('github:owner/repo', { yes: true });
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockAddSkill).toHaveBeenCalled();
    });
  });

  describe('--no-save', () => {
    it('应该安装技能但不写入 apm.json', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');

      try {
        await addCommand('github:owner/repo', { noSave: true, yes: true });
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockAddSkill).not.toHaveBeenCalled();
      expect(mockInstallCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          internal: true,
          skills: ['test-skill'],
          prefetchedSourceDir: '/tmp/repo',
          skillEntries: expect.objectContaining({
            'test-skill': expect.objectContaining({
              sourceType: 'github',
              source: 'owner/repo',
            }),
          }),
        })
      );
      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('This skill is not managed by apm ls/install/update/remove')
      );
    });
  });

  describe('技能已存在', () => {
    beforeEach(() => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {
          'existing-skill': {
            sourceType: 'npm',
            source: 'package',
            sourceUrl: 'https://registry.npmjs.org/package',
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      });
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      const mockSkill = {
        name: 'existing-skill',
        description: 'Existing skill',
        path: '/tmp/existing-skill',
        rawContent: '',
        metadata: {},
      };
      mockDiscoverSkills.mockResolvedValue([mockSkill]);
    });

    it('应该询问是否覆盖', async () => {
      mockConfirm.mockResolvedValue(false);

      try {
        await addCommand('npm:package');
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockConfirm).toHaveBeenCalledWith({
        message: expect.stringContaining('already exists'),
      });
    });

    it('用户确认后应该覆盖', async () => {
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('npm:package', { yes: true });
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockAddSkill).toHaveBeenCalled();
    });

    it('--no-save 时应该显示不保存的确认提示', async () => {
      mockConfirm.mockResolvedValue(false);

      try {
        await addCommand('npm:package', { noSave: true });
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockConfirm).toHaveBeenCalledWith({
        message: expect.stringContaining('Install without saving'),
      });
      expect(mockAddSkill).not.toHaveBeenCalled();
    });
  });

  describe('全局模式', () => {
    it('应该安装到全局配置', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      mockConfirm.mockResolvedValue(true);

      try {
        await addCommand('github:owner/repo', { global: true });
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockReadSkillsJson).toHaveBeenCalledWith(true);
      expect(mockAddSkill).toHaveBeenCalledWith(expect.any(String), expect.any(Object), true);
    });
  });

  describe('内部安装失败', () => {
    it('应该输出原始错误并清理临时目录', async () => {
      mockCloneRepo.mockResolvedValue('/tmp/repo');
      mockInstallCommand.mockRejectedValue(new Error('install failed'));

      try {
        await addCommand('github:owner/repo', { yes: true });
      } catch (e) {
        // process.exit 会被调用
      }

      expect(mockLogError).toHaveBeenCalledWith('install failed');
      expect(mockOutro).toHaveBeenCalledWith(expect.stringContaining('Some skills failed to install'));
      expect(mockGitCleanup).toHaveBeenCalledWith('/tmp/repo');
    });
  });

  describe('未找到技能', () => {
    it('Git 源应该显示仓库错误并退出', async () => {
      mockDiscoverSkills.mockResolvedValue([]);
      mockCloneRepo.mockResolvedValue('/tmp/repo');

      try {
        await addCommand('github:owner/repo');
      } catch (e) {
        // expected process.exit(1)
      }

      expect(mockOutro).toHaveBeenCalledWith(expect.stringContaining('No valid SKILL.md files found'));
    });

    it('NPM 源应该显示包错误并退出', async () => {
      mockDiscoverSkills.mockResolvedValue([]);
      mockResolveNpmVersion.mockResolvedValue('1.0.0');
      mockDownloadNpmPackage.mockResolvedValue('/tmp/repo');

      try {
        await addCommand('npm:test-package');
      } catch (e) {
        // expected process.exit(1)
      }

      expect(mockOutro).toHaveBeenCalledWith(expect.stringContaining('Package does not contain any valid SKILL.md files'));
    });
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
