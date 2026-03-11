/**
 * remove 命令实现
 * 从 apm.json 移除技能并删除已安装的文件
 */

import * as p from '@clack/prompts';
import { rm } from 'fs/promises';
import { join } from 'path';
import pc from 'picocolors';
import { getConfiguredAgents, resolveAgentSkillsDir } from '../agents.js';
import { readSkillsJson, removeSkill } from '../skills-json';
import { showLogo } from '../logo.js';
import type { RemoveOptions } from '../types';

/**
 * 执行 remove 命令
 *
 * @param skillNames - 要移除的技能名称列表
 * @param options - 命令选项
 */
export async function removeCommand(skillNames: string[], options: RemoveOptions = {}): Promise<void> {
  const { global = false } = options;

  showLogo();
  p.intro(pc.bgCyan(pc.black(' apm ')));

  const skillsJson = await readSkillsJson(global);
  const agents = getConfiguredAgents(skillsJson.additionalAgents);
  const toRemove = skillNames.filter((name) => name in skillsJson.skills);

  const configLocation = global ? '~/.agents/apm.json' : 'apm.json';

  if (toRemove.length === 0) {
    p.log.warn(`No matching skills found in ${configLocation}`);
    p.outro(pc.dim(`Run "skills list${global ? ' -g' : ''}" to see available skills`));
    return;
  }

  // 显示要移除的技能
  console.log();
  p.log.step(pc.bold(`Removing ${toRemove.length} skill${toRemove.length > 1 ? 's' : ''}`));
  for (const name of toRemove) {
    p.log.message(`  ${pc.cyan(name)}`);
  }
  console.log();

  // 确认
  if (!options.yes) {
    const confirmed = await p.confirm({
      message: `Remove ${toRemove.length} skill${toRemove.length > 1 ? 's' : ''} from ${configLocation}?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Cancelled');
      return;
    }
  }

  // 移除技能
  const spinner = p.spinner();
  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  for (const name of toRemove) {
    spinner.start(`Removing ${name}...`);

    try {
      // 1. 从 apm.json 移除
      await removeSkill(name, global);

      // 2. 删除已安装的文件
      for (const agent of agents) {
        const skillPath = join(resolveAgentSkillsDir(agent, global), name);
        await rm(skillPath, { recursive: true, force: true }).catch(() => {
          // 忽略不存在的目录
        });
      }

      spinner.stop(`${pc.green('✓')} Removed ${name}`);
      results.push({ name, success: true });
    } catch (error) {
      spinner.stop(`${pc.red('✗')} Failed to remove ${name}`);
      results.push({
        name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 结果汇总
  const success = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log();

  if (success.length > 0) {
    p.log.success(pc.green(`Removed ${success.length} skill${success.length > 1 ? 's' : ''}`));
  }

  if (failed.length > 0) {
    p.log.error(pc.red(`Failed to remove ${failed.length} skill${failed.length > 1 ? 's' : ''}`));
    for (const f of failed) {
      p.log.message(`  ${pc.red('✗')} ${f.name}: ${pc.dim(f.error)}`);
    }
    console.log();
    p.outro(pc.red('Removal incomplete'));
    process.exit(1);
  }

  p.outro(pc.green('Done!'));
}
