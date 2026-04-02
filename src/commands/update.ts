/**
 * update 命令实现
 * 更新技能到最新版本
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readSkillsJson, writeSkillsJson } from '../skills-json';
import type {
  BranchSkillEntry,
  NpmSkillEntry,
  SkillEntry,
  TagSkillEntry,
  UpdateOptions,
  VersionCheckResult,
} from '../types';
import { checkSkillVersion } from './check';
import { installCommand } from './install';
import { showLogo } from '../logo.js';

function formatDisplayVersion(version: string, sourceType: VersionCheckResult['sourceType']): string {
  return sourceType === 'github' || sourceType === 'git' ? version.slice(0, 7) : version;
}

/**
 * 获取所有可更新的技能
 *
 * @param global - 是否使用全局配置
 * @returns 版本检查结果数组（只包含有更新的技能）
 */
async function getAllUpdateableSkills(global = false): Promise<VersionCheckResult[]> {
  const skillsJson = await readSkillsJson(global);
  const skills = Object.entries(skillsJson.skills);

  if (skills.length === 0) {
    return [];
  }

  // 检查所有技能的版本
  const results: VersionCheckResult[] = [];

  for (const [name, entry] of skills) {
    // 跳过 local 类型的技能
    if (entry.sourceType === 'local') {
      continue;
    }

    const result = await checkSkillVersion(name, entry);
    // 只返回有更新的技能
    if (result.hasUpdate && !result.error) {
      results.push(result);
    }
  }

  return results;
}

/**
 * 交互式选择要更新的技能
 *
 * @param updateableSkills - 可更新的技能列表
 * @returns 用户选择的技能名称列表
 */
async function selectSkillsToUpdate(updateableSkills: VersionCheckResult[]): Promise<string[]> {
  if (updateableSkills.length === 0) {
    return [];
  }

  // 构建选项
  const options = updateableSkills.map((skill) => ({
    value: skill.name,
    label: skill.name,
    hint: `${pc.yellow(skill.current.version)} → ${pc.green(formatDisplayVersion(skill.latest!.version, skill.sourceType))}`,
  }));

  // 添加"全选"选项
  const selectAll = {
    value: '__all__',
    label: 'All skills',
    hint: `Update all ${updateableSkills.length} skills`,
  };

  const selected = await p.multiselect({
    message: `Select skills to update (${updateableSkills.length} available)`,
    options: [selectAll, ...options],
    required: false,
  });

  if (p.isCancel(selected)) {
    return [];
  }

  // 检查是否选择了"全选"
  if (selected.includes('__all__')) {
    return updateableSkills.map((s) => s.name);
  }

  return selected as string[];
}

/**
 * 更新单个技能到 apm.json
 *
 * @param name - 技能名称
 * @param result - 版本检查结果
 * @param global - 是否使用全局配置
 */
async function updateSkillInJson(name: string, result: VersionCheckResult, global = false): Promise<void> {
  const skillsJson = await readSkillsJson(global);
  const entry = skillsJson.skills[name];

  if (!entry) {
    const configLocation = global ? '~/.agents/apm.json' : 'apm.json';
    throw new Error(`Skill ${name} not found in ${configLocation}`);
  }

  // 根据源类型更新版本
  if (entry.sourceType === 'npm') {
    // NPM 类型：更新版本号
    (entry as NpmSkillEntry).version = result.latest!.version;
  } else if ((entry.sourceType === 'github' || entry.sourceType === 'git') && entry.mode === 'tag') {
    // Git Tag 类型：更新 tag
    (entry as TagSkillEntry).tag = result.latest!.version;
  } else if ((entry.sourceType === 'github' || entry.sourceType === 'git') && entry.mode === 'branch') {
    // Git Branch 类型：更新 commit
    (entry as BranchSkillEntry).commit = result.latest!.version;
  } else {
    throw new Error(`Cannot update skill ${name}: unsupported source type or mode`);
  }

  // 写回 apm.json
  await writeSkillsJson(skillsJson, global);
}

/**
 * update 命令主函数
 *
 * @param options - 命令选项
 */
export async function updateCommand(options: UpdateOptions = {}): Promise<void> {
  const { global = false } = options;
  const configLocation = global ? '~/.agents/apm.json' : 'apm.json';

  showLogo();
  p.intro(pc.bgCyan(pc.black(' apm update ')));

  // 1. 获取可更新的技能
  let updateableSkills: VersionCheckResult[];

  if (options.skills && options.skills.length > 0) {
    // 如果指定了技能名称，只检查这些技能
    const skillsJson = await readSkillsJson(global);
    const specifiedSkills = options.skills
      .map((name) => {
        const entry = skillsJson.skills[name];
        if (!entry) {
          p.log.warn(pc.yellow(`Skill ${name} not found in ${configLocation}`));
          return null;
        }
        return [name, entry] as [string, typeof entry];
      })
      .filter((s): s is [string, SkillEntry] => s !== null);

    if (specifiedSkills.length === 0) {
      p.log.warn(pc.yellow('No valid skills to update'));
      p.outro(pc.dim('Run "apm check" to see available updates'));
      return;
    }

    // 检查指定的技能
    const results: VersionCheckResult[] = [];
    for (const [name, entry] of specifiedSkills) {
      if (entry.sourceType === 'local') {
        p.log.warn(pc.yellow(`Skipping ${name}: local skills cannot be updated`));
        continue;
      }

      const result = await checkSkillVersion(name, entry);
      if (result.hasUpdate && !result.error) {
        results.push(result);
      } else {
        const reason = result.error
          ? pc.red(result.error)
          : result.warning
            ? pc.yellow(result.warning)
            : pc.dim('Already up to date');
        p.log.message(`  ${pc.cyan(name)}: ${reason}`);
      }
    }

    updateableSkills = results;
  } else {
    // 检查所有技能
    updateableSkills = await getAllUpdateableSkills(global);
  }

  if (updateableSkills.length === 0) {
    p.log.success(pc.green('All skills are up to date'));
    p.outro(pc.dim('Run "apm check" to see version information'));
    return;
  }

  // 2. 选择要更新的技能
  let skillsToUpdate: string[];

  if (options.select) {
    // 交互式选择
    skillsToUpdate = await selectSkillsToUpdate(updateableSkills);

    if (skillsToUpdate.length === 0) {
      p.cancel(pc.yellow('No skills selected'));
      return;
    }
  } else {
    // 更新所有可更新的技能
    skillsToUpdate = updateableSkills.map((s) => s.name);
  }

  // 3. 确认
  console.log();
  p.log.message(`Updating ${skillsToUpdate.length} skill${skillsToUpdate.length > 1 ? 's' : ''}:`);
  console.log();

  for (const result of updateableSkills) {
    if (skillsToUpdate.includes(result.name)) {
      const latestVersion = formatDisplayVersion(result.latest!.version, result.sourceType);
      p.log.message(`  ${pc.cyan(result.name)}: ${pc.yellow(result.current.version)} → ${pc.green(latestVersion)}`);
    }
  }

  console.log();

  const confirmed = await p.confirm({
    message: `Update ${skillsToUpdate.length} skill${skillsToUpdate.length > 1 ? 's' : ''}?`,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Cancelled');
    return;
  }

  // 4. 更新 apm.json
  const spinner = p.spinner();
  spinner.start(`Updating ${configLocation}...`);

  const updateResults: Array<{
    name: string;
    success: boolean;
    error?: string;
  }> = [];

  for (const result of updateableSkills) {
    if (!skillsToUpdate.includes(result.name)) {
      continue;
    }

    try {
      await updateSkillInJson(result.name, result, global);
      updateResults.push({ name: result.name, success: true });
    } catch (error) {
      updateResults.push({
        name: result.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  spinner.stop(`Updated ${configLocation}`);

  // 5. 显示更新结果
  console.log();
  for (const result of updateResults) {
    if (result.success) {
      p.log.message(`  ${pc.green('✓')} ${result.name}`);
    } else {
      p.log.message(`  ${pc.red('✗')} ${result.name}: ${pc.dim(result.error)}`);
    }
  }

  // 6. 安装更新后的技能（除非使用了 --no-install）
  if (!options.noInstall) {
    const successUpdates = updateResults.filter((r) => r.success);

    if (successUpdates.length > 0) {
      console.log();
      const skillNames = successUpdates.map((r) => r.name);

      // 调用 install 命令
      await installCommand({
        skills: skillNames,
        internal: true,
        global,
      });
    }
  } else {
    console.log();
    p.log.info(pc.dim('Skipped installation. Run "apm install" to install updates.'));
  }

  // 7. 结果汇总
  console.log();

  const success = updateResults.filter((r) => r.success);
  const failed = updateResults.filter((r) => !r.success);

  if (failed.length > 0) {
    p.outro(pc.red(`${failed.length} skill${failed.length > 1 ? 's' : ''} failed to update`));
    process.exit(1);
  }

  p.outro(pc.green(`Successfully updated ${success.length} skill${success.length > 1 ? 's' : ''}!`));
}
