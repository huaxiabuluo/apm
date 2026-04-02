import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies - 必须在实际导入之前
vi.mock('cli-table3', () => {
  return {
    default: vi.fn(function MockedTable() {
      return {
        push: vi.fn(),
        toString: vi.fn().mockReturnValue('Mocked Table'),
      };
    }),
  };
});

vi.mock('../git/remote', () => ({
  getRemoteTags: vi.fn(),
  filterSemanticVersions: vi.fn(),
  getRemoteBranchCommit: vi.fn(),
}));

vi.mock('../npm/resolve-version', () => ({
  resolveNpmVersion: vi.fn(),
  compareVersions: vi.fn(),
  isExactNpmVersion: vi.fn(),
}));

vi.mock('../skills-json', () => ({
  readSkillsJson: vi.fn(),
}));

import { filterSemanticVersions, getRemoteBranchCommit, getRemoteTags } from '../git/remote';
import { compareVersions, isExactNpmVersion, resolveNpmVersion } from '../npm/resolve-version';
import { readSkillsJson } from '../skills-json';
import { checkCommand, checkSkillVersion } from './check';

const mockGetRemoteTags = getRemoteTags as any;
const mockFilterSemanticVersions = filterSemanticVersions as any;
const mockGetRemoteBranchCommit = getRemoteBranchCommit as any;
const mockResolveNpmVersion = resolveNpmVersion as any;
const mockCompareVersions = compareVersions as any;
const mockIsExactNpmVersion = isExactNpmVersion as any;
const mockReadSkillsJson = readSkillsJson as any;

describe('checkCommand', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();
    mockIsExactNpmVersion.mockImplementation((version: string) => version !== 'latest');
  });

  describe('检查 NPM 包更新', () => {
    it('应该检测到有新版本', async () => {
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
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockResolveNpmVersion.mockResolvedValue('1.1.0');
      mockCompareVersions.mockReturnValue(1);

      await checkCommand();

      expect(mockResolveNpmVersion).toHaveBeenCalledWith('test-package', undefined, undefined);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('应该显示已是最新版本', async () => {
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
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockResolveNpmVersion.mockResolvedValue('1.0.0');
      mockCompareVersions.mockReturnValue(0);

      await checkCommand();

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('检查 Git Tag 更新', () => {
    it('应该检测到新的 tag', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'git-skill': {
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
      mockGetRemoteTags.mockResolvedValue(['v1.0.0', 'v1.1.0', 'v2.0.0']);
      mockFilterSemanticVersions.mockReturnValue(['v1.0.0', 'v1.1.0', 'v2.0.0']);
      mockCompareVersions.mockImplementation((a: string, b: string) => {
        const aNum = parseInt(a.replace('v', ''));
        const bNum = parseInt(b.replace('v', ''));
        return aNum - bNum;
      });

      await checkCommand();

      expect(mockGetRemoteTags).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('应该处理没有语义化版本的 tag', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'git-skill': {
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
      mockGetRemoteTags.mockResolvedValue(['latest', 'stable']);
      mockFilterSemanticVersions.mockReturnValue([]);

      await checkCommand();

      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('检查 Git Branch 更新', () => {
    it('应该检测到新的 commit', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'git-skill': {
            sourceType: 'github',
            source: 'owner/repo',
            sourceUrl: 'https://github.com/owner/repo.git',
            mode: 'branch',
            branch: 'main',
            commit: 'abc123def456789',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockGetRemoteBranchCommit.mockResolvedValue('def987ghi654321');

      await checkCommand();

      expect(mockGetRemoteBranchCommit).toHaveBeenCalledWith('https://github.com/owner/repo.git', 'main');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('检查指定技能', () => {
    it('应该只检查指定的技能', async () => {
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
            version: '1.0.0',
            skillPath: 'SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockResolveNpmVersion.mockResolvedValue('1.0.0');
      mockCompareVersions.mockReturnValue(0);

      await checkCommand({ skills: ['skill1'] });

      expect(mockResolveNpmVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('全局模式', () => {
    it('应该使用全局配置', async () => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {},
      });

      await checkCommand({ global: true });

      expect(mockReadSkillsJson).toHaveBeenCalledWith(true);
    });
  });
});

describe('checkSkillVersion', () => {
  describe('npm 技能', () => {
    it('应该返回有更新的结果', async () => {
      const entry = {
        sourceType: 'npm' as const,
        source: 'test-package',
        sourceUrl: 'https://registry.npmjs.org/test-package',
        version: '1.0.0',
        skillPath: 'SKILL.md',
      };

      mockResolveNpmVersion.mockResolvedValue('1.1.0');
      mockCompareVersions.mockReturnValue(1);

      const result = await checkSkillVersion('test-npm', entry);

      expect(result).toEqual({
        name: 'test-npm',
        sourceType: 'npm',
        current: { version: '1.0.0' },
        latest: { version: '1.1.0' },
        hasUpdate: true,
      });
    });

    it('应该处理错误', async () => {
      const entry = {
        sourceType: 'npm' as const,
        source: 'test-package',
        sourceUrl: 'https://registry.npmjs.org/test-package',
        version: '1.0.0',
        skillPath: 'SKILL.md',
      };

      mockResolveNpmVersion.mockRejectedValue(new Error('Package not found'));

      const result = await checkSkillVersion('test-npm', entry);

      expect(result).toEqual({
        name: 'test-npm',
        sourceType: 'npm',
        current: { version: '1.0.0' },
        hasUpdate: false,
        error: 'Package not found',
      });
    });

    it('should treat latest as a floating npm version without reporting updates', async () => {
      const entry = {
        sourceType: 'npm' as const,
        source: '@ai-dancer/apm',
        sourceUrl: 'https://registry.npmjs.org/@ai-dancer/apm',
        version: 'latest',
        skillPath: 'skills/apm/SKILL.md',
      };

      mockIsExactNpmVersion.mockReturnValue(false);
      mockResolveNpmVersion.mockImplementation((source: string, version?: string) =>
        Promise.resolve(version === 'latest' ? '1.2.3' : '1.2.3'),
      );

      const result = await checkSkillVersion('apm', entry);

      expect(result).toEqual({
        name: 'apm',
        sourceType: 'npm',
        current: { version: '1.2.3', extra: 'latest' },
        latest: { version: '1.2.3' },
        hasUpdate: false,
      });
    });
  });

  describe('git tag 技能', () => {
    it('应该返回有更新的结果', async () => {
      const entry = {
        sourceType: 'github' as const,
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo.git',
        mode: 'tag' as const,
        tag: 'v1.0.0',
        skillPath: 'SKILL.md',
      };

      mockGetRemoteTags.mockResolvedValue(['v1.0.0', 'v1.1.0', 'v2.0.0']);
      mockFilterSemanticVersions.mockReturnValue(['v1.0.0', 'v1.1.0', 'v2.0.0']);
      mockCompareVersions.mockImplementation((a: string, b: string) => {
        const aNum = parseInt(a.replace('v', ''));
        const bNum = parseInt(b.replace('v', ''));
        return aNum - bNum;
      });

      const result = await checkSkillVersion('test-tag', entry);

      expect(result.hasUpdate).toBe(true);
      expect(result.latest?.version).toBe('v2.0.0');
    });

    it('应该警告没有语义化版本', async () => {
      const entry = {
        sourceType: 'github' as const,
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo.git',
        mode: 'tag' as const,
        tag: 'v1.0.0',
        skillPath: 'SKILL.md',
      };

      mockGetRemoteTags.mockResolvedValue(['latest', 'stable']);
      mockFilterSemanticVersions.mockReturnValue([]);

      const result = await checkSkillVersion('test-tag', entry);

      expect(result.hasUpdate).toBe(false);
      expect(result.warning).toBe('No semantic version tags found');
    });
  });

  describe('git branch 技能', () => {
    it('应该检测到新的 commit', async () => {
      const entry = {
        sourceType: 'github' as const,
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo.git',
        mode: 'branch' as const,
        branch: 'main',
        commit: 'abc123def456789',
        skillPath: 'SKILL.md',
      };

      mockGetRemoteBranchCommit.mockResolvedValue('def987ghi654321');

      const result = await checkSkillVersion('test-branch', entry);

      expect(result.hasUpdate).toBe(true);
      expect(result.latest?.version).toBe('def987ghi654321');
      expect(result.current?.extra).toBe('main');
    });

    it('应该处理错误', async () => {
      const entry = {
        sourceType: 'github' as const,
        source: 'owner/repo',
        sourceUrl: 'https://github.com/owner/repo.git',
        mode: 'branch' as const,
        branch: 'main',
        commit: 'abc123def456789',
        skillPath: 'SKILL.md',
      };

      mockGetRemoteBranchCommit.mockRejectedValue(new Error('Branch not found'));

      const result = await checkSkillVersion('test-branch', entry);

      expect(result.hasUpdate).toBe(false);
      expect(result.error).toBe('Branch not found');
    });
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
