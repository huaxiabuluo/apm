/**
 * check 命令实现
 * 检查技能是否有更新版本
 */

import Table from 'cli-table3';
import pc from 'picocolors';
import { filterSemanticVersions, getRemoteBranchCommit, getRemoteTags } from '../git/remote';
import { compareVersions, isExactNpmVersion, resolveNpmVersion } from '../npm/resolve-version';
import { readSkillsJson } from '../skills-json';
import { showLogo } from '../logo.js';
import type { BranchSkillEntry, CheckOptions, NpmSkillEntry, TagSkillEntry, VersionCheckResult } from '../types';

/**
 * 检查 npm 技能的 latest 版本
 *
 * @param name - 技能名称
 * @param entry - npm 技能条目
 * @returns 版本检查结果
 */
async function checkNpmSkill(name: string, entry: NpmSkillEntry): Promise<VersionCheckResult> {
  try {
    const current = isExactNpmVersion(entry.version)
      ? entry.version
      : await resolveNpmVersion(entry.source, entry.version, entry.registry);
    const latest = await resolveNpmVersion(entry.source, undefined, entry.registry);

    return {
      name,
      sourceType: entry.sourceType,
      current: {
        version: current,
        extra: current === entry.version ? undefined : entry.version,
      },
      latest: {
        version: latest,
      },
      hasUpdate: isExactNpmVersion(entry.version) ? compareVersions(latest, current) > 0 : false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      name,
      sourceType: entry.sourceType,
      current: {
        version: entry.version,
      },
      hasUpdate: false,
      error: errorMessage,
    };
  }
}

/**
 * 检查 git tag 技能的最新语义化版本
 *
 * @param name - 技能名称
 * @param entry - tag 技能条目
 * @returns 版本检查结果
 */
async function checkGitTagSkill(name: string, entry: TagSkillEntry): Promise<VersionCheckResult> {
  try {
    const allTags = await getRemoteTags(entry.sourceUrl);
    const semverTags = filterSemanticVersions(allTags);

    if (semverTags.length === 0) {
      // 没有语义化版本 tag，返回警告
      return {
        name,
        sourceType: entry.sourceType,
        current: {
          version: entry.tag,
        },
        hasUpdate: false,
        warning: 'No semantic version tags found',
      };
    }

    // 排序找到最新版本
    const latest = semverTags.sort((a, b) => compareVersions(b, a))[0];
    const hasUpdate = compareVersions(latest, entry.tag) > 0;

    // 检查当前 tag 是否是语义化版本
    const isSemver = semverTags.includes(entry.tag);

    return {
      name,
      sourceType: entry.sourceType,
      current: {
        version: entry.tag,
      },
      latest: {
        version: latest,
      },
      hasUpdate,
      warning: isSemver ? undefined : 'Current tag is not a semantic version',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      name,
      sourceType: entry.sourceType,
      current: {
        version: entry.tag,
      },
      hasUpdate: false,
      error: errorMessage,
    };
  }
}

/**
 * 检查 git branch 技能的最新 commit
 *
 * @param name - 技能名称
 * @param entry - branch 技能条目
 * @returns 版本检查结果
 */
async function checkGitBranchSkill(name: string, entry: BranchSkillEntry): Promise<VersionCheckResult> {
  try {
    const latestCommit = await getRemoteBranchCommit(entry.sourceUrl, entry.branch);
    const shortCommit = latestCommit.slice(0, 7);
    const hasUpdate = latestCommit !== entry.commit;

    return {
      name,
      sourceType: entry.sourceType,
      current: {
        version: entry.commit.slice(0, 7),
        extra: entry.branch,
      },
      latest: {
        version: shortCommit,
        extra: entry.branch,
      },
      hasUpdate,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      name,
      sourceType: entry.sourceType,
      current: {
        version: entry.commit.slice(0, 7),
        extra: entry.branch,
      },
      hasUpdate: false,
      error: errorMessage,
    };
  }
}

/**
 * 检查单个技能的版本（路由函数）
 *
 * @param name - 技能名称
 * @param entry - 技能条目
 * @returns 版本检查结果
 */
export async function checkSkillVersion(
  name: string,
  entry: NpmSkillEntry | TagSkillEntry | BranchSkillEntry,
): Promise<VersionCheckResult> {
  const sourceType = entry.sourceType;

  // 根据不同的 sourceType 调用相应的检查函数
  if (sourceType === 'npm') {
    return checkNpmSkill(name, entry as NpmSkillEntry);
  }

  if (sourceType === 'github' || sourceType === 'git') {
    const gitEntry = entry as TagSkillEntry | BranchSkillEntry;
    if (gitEntry.mode === 'tag') {
      return checkGitTagSkill(name, gitEntry as TagSkillEntry);
    }
    if (gitEntry.mode === 'branch') {
      return checkGitBranchSkill(name, gitEntry as BranchSkillEntry);
    }
    return {
      name,
      sourceType,
      current: {
        version: 'unknown',
      },
      hasUpdate: false,
      error: 'Unknown mode',
    };
  }

  return {
    name,
    sourceType,
    current: {
      version: 'unknown',
    },
    hasUpdate: false,
    error: `Unsupported source type: ${sourceType}`,
  };
}

/**
 * 显示检查结果表格
 *
 * @param results - 版本检查结果数组
 */
function displayCheckResults(results: VersionCheckResult[]): void {
  if (results.length === 0) {
    console.log(pc.yellow('No skills to check'));
    return;
  }

  // 创建表格
  const table = new Table({
    head: [pc.dim('STATUS'), pc.dim('NAME'), pc.dim('TYPE'), pc.dim('CURRENT'), pc.dim('LATEST')],
    style: {
      head: [],
      border: ['dim'],
    },
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: ' │ ',
    },
  });

  // 统计
  let updateCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  // 填充表格数据
  for (const result of results) {
    let status: string;
    let current: string;
    let latest: string;

    // 确定 Status 图标和颜色
    if (result.error) {
      status = pc.red('✗');
      errorCount++;
    } else if (result.warning) {
      status = pc.yellow('⚠️');
      warningCount++;
    } else if (result.hasUpdate) {
      status = pc.green('↑');
      updateCount++;
    } else {
      status = pc.green('✓');
    }

    // 格式化当前版本
    if (result.current.extra) {
      current = pc.yellow(`${result.current.extra}@${result.current.version}`);
    } else {
      current = pc.yellow(result.current.version);
    }

    // 格式化最新版本
    if (result.error) {
      latest = pc.red(result.error);
    } else if (result.warning) {
      latest = pc.yellow(result.warning);
    } else if (result.latest) {
      if (result.latest.extra) {
        latest = pc.green(`${result.latest.extra}@${result.latest.version}`);
      } else {
        latest = pc.green(result.latest.version);
      }
    } else {
      latest = pc.dim('-');
    }

    table.push([status, pc.cyan(result.name), pc.cyan(result.sourceType), current, latest]);
  }

  // 输出表格
  console.log(table.toString());

  // 输出总结
  const summary: string[] = [];
  summary.push(pc.dim(`Checked: ${results.length} skill${results.length > 1 ? 's' : ''}`));

  if (updateCount > 0) {
    summary.push(pc.green(`${updateCount} update${updateCount > 1 ? 's' : ''} available`));
  }
  if (warningCount > 0) {
    summary.push(pc.yellow(`${warningCount} warning${warningCount > 1 ? 's' : ''}`));
  }
  if (errorCount > 0) {
    summary.push(pc.red(`${errorCount} error${errorCount > 1 ? 's' : ''}`));
  }

  console.log(summary.join(' · '));

  // 如果有更新，提示使用 update 命令
  if (updateCount > 0) {
    console.log(pc.dim(`\nRun "apm update" to update skills`));
  }
}

/**
 * check 命令主函数
 *
 * @param options - 命令选项
 */
export async function checkCommand(options: CheckOptions = {}): Promise<void> {
  const { global = false } = options;
  const configLocation = global ? '~/.agents/apm.json' : 'apm.json';

  showLogo();
  const skillsJson = await readSkillsJson(global);
  const skills = Object.entries(skillsJson.skills);

  if (skills.length === 0) {
    console.log(pc.yellow(`No skills in ${configLocation}`));
    console.log(pc.dim(`Run "apm add <source>${global ? ' -g' : ''}" to add skills`));
    return;
  }

  // 过滤要检查的技能
  let skillsToCheck = skills;
  if (options.skills && options.skills.length > 0) {
    const skillSet = new Set(options.skills.map((s) => s.toLowerCase()));
    skillsToCheck = skills.filter(([name]) => skillSet.has(name.toLowerCase()));

    if (skillsToCheck.length === 0) {
      console.log(pc.yellow(`No matching skills found: ${options.skills.join(', ')}`));
      return;
    }
  }

  // 检查所有技能的版本
  const results: VersionCheckResult[] = [];

  for (const [name, entry] of skillsToCheck) {
    // 跳过 local 类型的技能
    if (entry.sourceType === 'local') {
      continue;
    }

    const result = await checkSkillVersion(name, entry);
    results.push(result);

    // 如果遇到错误，停止检查
    if (result.error) {
      break;
    }
  }

  // 显示结果
  displayCheckResults(results);
}
