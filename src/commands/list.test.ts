import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies - 必须在实际导入之前
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('../constants', () => ({
  GLOBAL_APM_DIR: '/Users/test/.agents',
  APM_JSON_FILE: 'apm.json',
  APM_JSON_VERSION: 1,
}));

vi.mock('../skills-json', () => ({
  readSkillsJson: vi.fn(),
}));

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

import Table from 'cli-table3';
import { existsSync } from 'fs';
import { readSkillsJson } from '../skills-json';
import { listCommand } from './list';

const mockExistsSync = existsSync as any;
const mockReadSkillsJson = readSkillsJson as any;

describe('listCommand', () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockClear();
    consoleErrorSpy.mockClear();
  });

  describe('当没有技能时', () => {
    beforeEach(() => {
      mockReadSkillsJson.mockResolvedValue({
        version: 1,
        skills: {},
      });
    });

    it('应该显示提示消息', async () => {
      await listCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No skills in apm.json'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Run "skills add <source>" to add skills'));
    });

    it('全局模式应该显示全局配置路径', async () => {
      await listCommand({ global: true });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('~/.agents/apm.json'));
    });
  });

  describe('当有技能时', () => {
    const mockSkills = {
      version: 1,
      skills: {
        'test-npm': {
          sourceType: 'npm',
          source: 'test-package',
          sourceUrl: 'https://registry.npmjs.org/test-package',
          version: '1.0.0',
          skillPath: 'SKILL.md',
        },
        'test-github-tag': {
          sourceType: 'github',
          source: 'owner/repo',
          sourceUrl: 'https://github.com/owner/repo.git',
          mode: 'tag',
          tag: 'v1.0.0',
          skillPath: 'skills/test/SKILL.md',
        },
        'test-github-branch': {
          sourceType: 'github',
          source: 'owner/repo2',
          sourceUrl: 'https://github.com/owner/repo2.git',
          mode: 'branch',
          branch: 'main',
          commit: 'abc123def456789',
          skillPath: 'SKILL.md',
        },
      },
    };

    beforeEach(() => {
      mockReadSkillsJson.mockResolvedValue(mockSkills);
    });

    it('应该显示技能列表', async () => {
      mockExistsSync.mockReturnValue(true);
      await listCommand();

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(Table).toHaveBeenCalled();
    });

    it('应该显示总结信息', async () => {
      mockExistsSync.mockReturnValue(true);
      await listCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total: 3 skills'));
    });
  });

  describe('安装状态检测', () => {
    const mockSkills = {
      version: 1,
      skills: {
        'fully-installed': {
          sourceType: 'npm',
          source: 'package1',
          sourceUrl: 'https://registry.npmjs.org/package1',
          version: '1.0.0',
          skillPath: 'SKILL.md',
        },
        'partial-installed': {
          sourceType: 'npm',
          source: 'package2',
          sourceUrl: 'https://registry.npmjs.org/package2',
          version: '1.0.0',
          skillPath: 'SKILL.md',
        },
        'not-installed': {
          sourceType: 'npm',
          source: 'package3',
          sourceUrl: 'https://registry.npmjs.org/package3',
          version: '1.0.0',
          skillPath: 'SKILL.md',
        },
      },
    };

    it('应该检测完全安装的技能', async () => {
      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes('fully-installed');
      });

      await listCommand();

      expect(Table).toHaveBeenCalled();
    });

    it('应该检测部分安装的技能', async () => {
      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockExistsSync.mockImplementation((path: string) => {
        // universal 存在但 claude-code 不存在
        return path.includes('.agents/skills/partial-installed');
      });

      await listCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠ Warning'));
    });

    it('应该检测未安装的技能', async () => {
      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockExistsSync.mockReturnValue(false);

      await listCommand();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠ Warning'));
    });
  });

  describe('全局模式', () => {
    it('应该只检查 universal agent', async () => {
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
      mockExistsSync.mockReturnValue(true);

      await listCommand({ global: true });

      expect(mockReadSkillsJson).toHaveBeenCalledWith(true);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('verbose 模式', () => {
    it('应该显示详细的技能信息', async () => {
      const mockSkills = {
        version: 1,
        skills: {
          'test-skill': {
            sourceType: 'github',
            source: 'owner/repo',
            sourceUrl: 'https://github.com/owner/repo.git',
            mode: 'tag',
            tag: 'v1.0.0',
            skillPath: 'skills/test/SKILL.md',
          },
        },
      };

      mockReadSkillsJson.mockResolvedValue(mockSkills);
      mockExistsSync.mockReturnValue(true);

      await listCommand({ verbose: true });

      // verbose 模式应该显示更多行
      expect(Table).toHaveBeenCalled();
    });
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});
