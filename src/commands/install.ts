/**
 * install 命令实现
 * 从 apm.json 安装所有技能
 */

import * as p from '@clack/prompts';
import { lstat, mkdir, readdir, readlink, rm, symlink } from 'fs/promises';
import { basename, dirname, join, relative, resolve } from 'path';
import pc from 'picocolors';
import { getConfiguredAgentMap, resolveAgentSkillsDir } from '../agents.js';
import { cloneRepo, cleanup as gitCleanup, checkoutCommit } from '../git/clone';
import { downloadNpmPackage, cleanup as npmCleanup } from '../npm/download';
import { isExactNpmVersion, resolveNpmVersion } from '../npm/resolve-version';
import { readSkillsJson } from '../skills-json';
import { showLogo } from '../logo.js';
import type { AgentConfig, GitSkillEntry, InstallOptions, NpmSkillEntry, SkillEntry } from '../types';

/**
 * 解析父目录的符号链接
 * 处理父目录本身就是符号链接的情况
 */
async function resolveParentSymlinks(path: string): Promise<string> {
  const resolved = resolve(path);
  const dir = dirname(resolved);
  const base = basename(resolved);
  try {
    const { realpath } = await import('fs/promises');
    const realDir = await realpath(dir);
    return join(realDir, base);
  } catch {
    return resolved;
  }
}

/**
 * 创建符号链接（指向目录）
 * 参考 v1 的实现，使用相对路径并处理父目录符号链接
 */
async function createSymlink(target: string, linkPath: string): Promise<boolean> {
  try {
    const resolvedTarget = resolve(target);
    const resolvedLinkPath = resolve(linkPath);

    // 如果目标和链接路径相同，跳过
    if (resolvedTarget === resolvedLinkPath) {
      return true;
    }

    // 检查父目录符号链接解析后的路径是否相同
    const realTarget = await resolveParentSymlinks(target);
    const realLinkPath = await resolveParentSymlinks(linkPath);

    if (realTarget === realLinkPath) {
      return true;
    }

    // 处理已存在的符号链接或目录
    try {
      const stats = await lstat(linkPath);
      if (stats.isSymbolicLink()) {
        const existingTarget = await readlink(linkPath);
        const existingResolved = resolve(dirname(linkPath), existingTarget);
        if (existingResolved === resolvedTarget) {
          return true; // 已存在正确的符号链接
        }
        await rm(linkPath);
      } else {
        await rm(linkPath, { recursive: true });
      }
    } catch (err: unknown) {
      // ELOOP = 循环符号链接，尝试删除
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ELOOP') {
        try {
          await rm(linkPath, { force: true });
        } catch {
          // 删除失败，继续尝试创建符号链接
        }
      }
      // ENOENT 或其他错误，继续创建符号链接
    }

    // 确保父目录存在
    const linkDir = dirname(linkPath);
    await mkdir(linkDir, { recursive: true });

    // 使用解析后的父目录计算相对路径
    const realLinkDir = await resolveParentSymlinks(linkDir);
    const relativePath = relative(realLinkDir, target);

    // 创建符号链接（Windows 使用 junction，其他平台使用默认）
    const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
    await symlink(relativePath, linkPath, symlinkType);
    return true;
  } catch {
    return false;
  }
}

/**
 * 复制文件内容（使用 readFile + writeFile 避免 macOS 跨文件系统问题）
 */
async function copyFileContent(source: string, target: string): Promise<void> {
  const { readFile, writeFile } = await import('fs/promises');
  const content = await readFile(source);
  await writeFile(target, content);
}

/**
 * 复制目录（递归复制所有文件和子目录）
 */
async function copyDirectory(source: string, target: string): Promise<void> {
  await mkdir(target, { recursive: true });

  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(source, entry.name);
    const destPath = join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isSymbolicLink()) {
      // 对于符号链接，读取其指向并重新创建
      try {
        const linkTarget = await readlink(srcPath);
        await symlink(linkTarget, destPath);
      } catch (error) {
        // 符号链接处理失败，尝试直接复制文件内容
        await copyFileContent(srcPath, destPath);
      }
    } else {
      // 对于普通文件，使用 readFile + writeFile 避免 macOS -102 错误
      await copyFileContent(srcPath, destPath);
    }
  }
}

/**
 * 安装单个技能到所有目标 agent
 *
 * @param name - 技能名称
 * @param entry - 技能条目
 * @param targetAgents - 目标 agent 列表
 * @param allAgents - 所有可用的 agents 配置
 * @param global - 是否为全局安装
 * @param prefetchedSourceDir - 由调用方提供的预下载目录；在所有并行安装任务完成前必须保持有效
 */
async function installSkill(
  name: string,
  entry: SkillEntry,
  targetAgents: string[],
  allAgents: Record<string, AgentConfig>,
  global = false,
  prefetchedSourceDir?: string,
): Promise<void> {
  let tempDir: string;
  let cleanupFn: ((dir: string) => Promise<void>) | null = null;

  if (prefetchedSourceDir) {
    // add -> internal install 复用同一个已下载目录；其生命周期由调用方统一管理
    tempDir = prefetchedSourceDir;
  } else if (entry.sourceType === 'npm') {
    // 根据源类型选择下载方式
    const npmEntry: NpmSkillEntry = entry;
    const resolvedVersion = isExactNpmVersion(entry.version!)
      ? entry.version!
      : await resolveNpmVersion(entry.source, entry.version!, npmEntry.registry);
    tempDir = await downloadNpmPackage(entry.source, resolvedVersion, npmEntry.registry);
    cleanupFn = npmCleanup;
  } else if (entry.sourceType === 'github' || entry.sourceType === 'git') {
    // Git 仓库：克隆到临时目录
    // 对于 tag 类型，使用 --branch 克隆指定 tag
    // 对于 branch 类型，使用 --branch 克隆指定分支，然后 checkout 到 commit
    const gitEntry: GitSkillEntry = entry;
    const refToClone = gitEntry.mode === 'tag' ? gitEntry.tag : gitEntry.branch;
    tempDir = await cloneRepo(entry.sourceUrl, refToClone);
    cleanupFn = gitCleanup;

    // 如果是 branch 类型，需要 checkout 到指定的 commit
    if (gitEntry.mode === 'branch' && gitEntry.commit) {
      await checkoutCommit(tempDir, gitEntry.commit);
    }
  } else {
    throw new Error(`Source type ${entry.sourceType} not yet supported`);
  }

  try {
    // 2. 获取技能目录路径
    const skillMdPath = join(tempDir, entry.skillPath);
    const skillDir = dirname(skillMdPath);

    // 3. 安装到 universal (主副本) - 复制整个目录
    const universalAgent = allAgents.universal;
    const universalSkillDir = join(resolveAgentSkillsDir(universalAgent, global), name);

    // 先删除已存在的目录
    await rm(universalSkillDir, { recursive: true, force: true });
    // 复制整个技能目录
    await copyDirectory(skillDir, universalSkillDir);

    // 4. 为每个其他 agent 创建符号链接或复制
    for (const agentKey of targetAgents) {
      if (agentKey === 'universal') continue;

      const agent = allAgents[agentKey];
      if (!agent) continue;

      const agentSkillDir = join(resolveAgentSkillsDir(agent, global), name);

      // 尝试创建符号链接（指向目录）
      const symlinkCreated = await createSymlink(universalSkillDir, agentSkillDir);

      if (!symlinkCreated) {
        // 符号链接失败，回退到复制整个目录
        await rm(agentSkillDir, { recursive: true, force: true });
        await copyDirectory(universalSkillDir, agentSkillDir);
      }
    }
  } finally {
    if (cleanupFn) {
      await cleanupFn(tempDir);
    }
  }
}

function formatSkillSummary(skillNames: string[], maxVisible = 3): string {
  const visibleNames = skillNames.slice(0, maxVisible);
  const suffix = skillNames.length > maxVisible ? ', ...' : '';
  return `${skillNames.length} skill${skillNames.length > 1 ? 's' : ''}: ${visibleNames.join(', ')}${suffix}`;
}

/**
 * 执行 install 命令
 *
 * @param options - 命令选项
 * @param skillsToInstall - 要安装的技能列表（如果提供，只安装这些技能）
 */
export async function installCommand(options: InstallOptions = {}): Promise<void> {
  const { internal = false, skills: skillsToInstall, global = false, prefetchedSourceDir, skillEntries } = options;

  // 跳过 intro 时不显示
  if (!internal) {
    showLogo();
    p.intro(pc.bgCyan(pc.black(' apm ')));
  }

  // 1. 读取 apm.json 和 agent 配置
  const skillsJson = await readSkillsJson(global);
  const agents = getConfiguredAgentMap(skillsJson.additionalAgents);
  let skills = Object.entries(skillEntries ?? skillsJson.skills);

  // 如果指定了技能列表，只安装这些技能
  if (skillsToInstall && skillsToInstall.length > 0) {
    skills = skills.filter(([name]) => skillsToInstall.includes(name));
  }

  if (skills.length === 0) {
    p.log.warn('No skills to install');
    if (!internal) {
      p.outro(pc.dim('Run "apm add <source>" to add skills'));
    }
    return;
  }

  const skillNames = skills.map(([name]) => name);
  const skillSummary = formatSkillSummary(skillNames);

  if (!internal) {
    p.log.message(`Installing ${skillSummary}`);
  }

  // 2. 确定目标 agents
  const agentNames = Object.keys(agents);
  const targetAgents = options.agents ?? agentNames;

  // 3. 确认
  if (options.confirm) {
    console.log();
    for (const [name, entry] of skills) {
      p.log.message(`  ${pc.cyan(name)}: ${pc.dim(entry.source)}`);
    }
    console.log();

    const confirmed = await p.confirm({
      message: `Install ${skills.length} skill${skills.length > 1 ? 's' : ''}?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.cancel('Cancelled');
      return;
    }
  }

  // 4. 并行安装所有技能
  const spinner = p.spinner();
  spinner.start('Installing skills...');

  // 创建所有安装任务（处理错误，确保所有 Promise 都 resolve）
  const installTasks = skills.map(async ([name, entry]) => {
    try {
      await installSkill(name, entry, targetAgents, agents, global, prefetchedSourceDir);
      return { name, success: true };
    } catch (error) {
      return {
        name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 并行执行所有安装任务
  const results = await Promise.all(installTasks);

  spinner.stop('Install complete');

  // 5. 显示详细结果列表
  if (!internal) {
    console.log();
  }
  for (const result of results) {
    if (result.success) {
      p.log.message(`  ${pc.green('✓')} ${result.name}`);
    } else {
      p.log.message(`  ${pc.red('✗')} ${result.name}: ${pc.dim(result.error)}`);
    }
  }

  // 6. 结果汇总
  const success = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (!internal) {
    console.log();
  }

  if (failed.length > 0) {
    if (!internal) {
      p.outro(pc.red(`${failed.length} skill${failed.length > 1 ? 's' : ''} failed to install`));
    }
    throw new Error(`${failed.length} skills failed to install`);
  }

  // 只在非 internal 模式下显示成功 outro
  if (!internal) {
    p.outro(pc.green(`Installed ${success.length} skill${success.length > 1 ? 's' : ''}.`));
  }
}
