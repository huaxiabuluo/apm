/**
 * add 命令实现
 * 添加技能到 apm.json
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { cloneRepo, getCurrentBranch, getLatestCommit, cleanup as gitCleanup } from '../git/clone';
import { downloadNpmPackage, cleanup as npmCleanup } from '../npm/download';
import { resolveNpmVersion } from '../npm/resolve-version';
import { discoverSkills, filterSkills, getSkillDisplayName } from '../skills';
import { addSkill, readSkillsJson } from '../skills-json';
import { parseSource } from '../source-parser';
import { getDefaultAdditionalAgents } from '../agents.js';
import type { AddOptions, Skill, SkillEntry } from '../types';
import { installCommand } from './install';
import { showLogo } from '../logo.js';

/**
 * 多选辅助函数（兼容 clack 的取消处理）
 */
function multiselect<Value>(opts: {
  message: string;
  options: Array<{ value: Value; label: string; hint?: string }>;
  initialValues?: Value[];
  required?: boolean;
}) {
  return p.multiselect({
    ...opts,
    // Cast is safe: our options always have labels, which satisfies p.Option requirements
    options: opts.options as any,
    message: `${opts.message} ${pc.dim('(space to toggle)')}`,
  });
}

/**
 * 判断值是否是取消符号
 */
function isCancelled(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

function getNoSkillsMessage(sourceType: string): string {
  if (sourceType === 'npm') {
    return 'Package does not contain any valid SKILL.md files';
  }

  return 'No valid SKILL.md files found in repository';
}

function formatVersionMessage(mode: string | undefined, version: string): string {
  if (mode) {
    return `Version: ${pc.yellow(mode)} ${pc.yellow(version)}`;
  }

  return `Version: ${pc.yellow(version)}`;
}

function formatResolvedNpmVersionMessage(requestedVersion: string | undefined, resolvedVersion: string): string {
  const requested = requestedVersion || 'latest';

  if (requested === resolvedVersion) {
    return formatVersionMessage(undefined, resolvedVersion);
  }

  return `Version: ${pc.yellow(requested)} ${pc.dim('->')} ${pc.yellow(resolvedVersion)}`;
}

async function cleanupTempDir(
  sourceType: 'github' | 'git' | 'npm' | 'local',
  tempDir: string | null
): Promise<void> {
  if (!tempDir || sourceType === 'local') {
    return;
  }

  const cleanupFn = sourceType === 'npm' ? npmCleanup : gitCleanup;
  await cleanupFn(tempDir);
}

/**
 * 执行 add 命令
 *
 * @param sourceInput - 用户输入的源地址
 * @param options - 命令选项
 */
export async function addCommand(sourceInput: string, options: AddOptions = {}): Promise<void> {
  const { global = false } = options;

  showLogo();
  p.intro(pc.bgCyan(pc.black(' apm ')));

  // 1. 解析源地址
  const parsed = parseSource(sourceInput);
  p.log.message(`Source: ${pc.cyan(parsed.sourceUrl)}`);
  if (parsed.version && parsed.sourceType !== 'npm') {
    p.log.message(formatVersionMessage(parsed.mode, parsed.version));
  }

  // 2. 处理不同类型的源
  if (parsed.sourceType === 'local') {
    p.log.warn('Local path support not yet implemented');
    p.outro(pc.red('Coming soon!'));
    process.exit(1);
  }

  // 3. 克隆/下载仓库并发现技能
  const spinner = p.spinner();
  let tempDir: string | null = null;
  let discoveredSkills: Skill[];

  try {
    if (parsed.sourceType === 'npm') {
      // NPM 包：解析版本范围并下载
      spinner.start('Resolving package version...');
      try {
        const requestedVersion = parsed.version;
        const exactVersion = await resolveNpmVersion(parsed.source, parsed.version, parsed.registry);
        parsed.version = exactVersion;
        spinner.stop(formatResolvedNpmVersionMessage(requestedVersion, exactVersion));
        if (parsed.registry) {
          p.log.message(`Registry: ${pc.dim(parsed.registry)}`);
        }
      } catch (resolveError) {
        spinner.stop(pc.red('Failed to resolve package version'));

        // 提供更详细的错误信息和诊断建议
        const registryUrl = parsed.registry || 'https://registry.npmjs.org';
        p.log.error(pc.red(`Failed to fetch package from npm registry`));
        p.log.info(pc.dim(`Package:  ${pc.cyan(parsed.source)}`));
        p.log.info(pc.dim(`Registry: ${pc.cyan(registryUrl)}`));

        const hasVersion = parsed.version !== undefined;
        if (!hasVersion) {
          p.log.info('');
          p.log.info(pc.yellow('No version specified - trying to fetch from registry'));
        }

        p.log.info('');
        p.log.info(pc.yellow('Possible solutions:'));
        p.log.info('');
        p.log.info(`  1. Check package exists on registry:`);
        p.log.info(pc.dim(`     curl -s ${registryUrl}/${parsed.source} | head -20`));
        p.log.info('');
        p.log.info(`  2. Specify an explicit version:`);
        p.log.info(pc.dim(`     ${pc.cyan(`apm add npm:${parsed.source}@1.0.0`)}`));
        p.log.info('');
        p.log.info(`  3. Check network connectivity:`);
        p.log.info(pc.dim(`     ping ${new URL(registryUrl).hostname}`));
        p.log.info('');
        p.log.info(`  4. Check if the package name is correct`);
        p.log.info('');
        p.log.info(`  5. If using a custom registry, verify the registry URL`);

        throw resolveError;
      }

      spinner.start('Downloading package...');
      tempDir = await downloadNpmPackage(parsed.source, parsed.version!, parsed.registry);
      spinner.stop('Package downloaded');
    } else {
      // Git 仓库：克隆
      spinner.start('Cloning repository...');
      tempDir = await cloneRepo(parsed.sourceUrl, parsed.version);
      spinner.stop('Repository cloned');

      // 如果未指定版本，使用 branch 模式（获取默认分支和最新 commit）
      if (!parsed.version) {
        const currentBranch = await getCurrentBranch(tempDir);
        const latestCommit = await getLatestCommit(tempDir);
        parsed.mode = 'branch';
        parsed.branch = currentBranch;
        parsed.version = latestCommit;
      }

      // 如果指定了分支，也使用 branch 模式
      if (parsed.mode === 'branch') {
        if (!parsed.branch) {
          parsed.branch = await getCurrentBranch(tempDir);
        }
        if (!parsed.version) {
          parsed.version = await getLatestCommit(tempDir);
        }
      }
    }

    spinner.start('Discovering skills...');
    discoveredSkills = await discoverSkills(tempDir);

    if (discoveredSkills.length === 0) {
      spinner.stop();
      p.outro(pc.red(getNoSkillsMessage(parsed.sourceType)));
      await cleanupTempDir(parsed.sourceType, tempDir);
      process.exit(1);
    }

    spinner.stop(`Found ${pc.green(discoveredSkills.length)} skill${discoveredSkills.length > 1 ? 's' : ''}`);

    // 5. 如果是 list 模式，只列出不安装
    if (options.list) {
      console.log();
      for (const skill of discoveredSkills) {
        p.log.message(`${pc.cyan('•')} ${pc.bold(getSkillDisplayName(skill))}`);
        if (skill.description) {
          p.log.message(`  ${pc.dim(skill.description)}`);
        }
        console.log();
      }
      p.outro(`Use ${pc.yellow('--skill <name>')} to install specific skills`);
      await cleanupTempDir(parsed.sourceType, tempDir);
      process.exit(0);
    }

    // 6. 选择要安装的技能
    let selectedSkills: Skill[];

    if (options.skill?.includes('*')) {
      // --skill '*' 安装所有
      selectedSkills = discoveredSkills;
      p.log.info(`Installing all ${selectedSkills.length} skills`);
    } else if (options.skill && options.skill.length > 0) {
      // --skill <name> 过滤选择
      selectedSkills = filterSkills(discoveredSkills, options.skill);
      if (selectedSkills.length === 0) {
        p.log.error(`No matching skills found for: ${options.skill.join(', ')}`);
        p.outro(pc.dim('Available skills:') + ' ' + discoveredSkills.map((s) => pc.cyan(s.name)).join(', '));
        await cleanupTempDir(parsed.sourceType, tempDir);
        process.exit(1);
      }
      p.log.info(
        `Selected ${selectedSkills.length} skill${selectedSkills.length !== 1 ? 's' : ''}: ${selectedSkills
          .map((s) => pc.cyan(s.name))
          .join(', ')}`
      );
    } else if (discoveredSkills.length === 1) {
      // 只有一个技能，自动选择
      selectedSkills = discoveredSkills;
      p.log.info(`Skill: ${pc.cyan(getSkillDisplayName(selectedSkills[0]))}`);
    } else if (options.yes) {
      // --yes 模式，安装所有
      selectedSkills = discoveredSkills;
      p.log.info(`Installing all ${selectedSkills.length} skills`);
    } else {
      // 交互式选择
      const skillChoices = discoveredSkills.map((s) => ({
        value: s,
        label: getSkillDisplayName(s),
        hint: s.description.length > 60 ? s.description.slice(0, 57) + '...' : s.description,
      }));

      const selected = await multiselect({
        message: 'Select skills to install',
        options: skillChoices,
        required: true,
      });

      if (isCancelled(selected)) {
        p.cancel('Installation cancelled');
        await cleanupTempDir(parsed.sourceType, tempDir);
        process.exit(0);
      }

      selectedSkills = selected as Skill[];
    }

    // 7. 为每个技能构建 entry 并添加到 apm.json
    const currentSkills = await readSkillsJson(global);
    const results: Array<{ skill: Skill; success: boolean; error?: string }> = [];

    for (const skill of selectedSkills) {
      try {
        // 计算相对路径
        let relativePath = skill.path.replace(tempDir!, '');

        // 移除可能存在的前导斜杠（兼容 source-parser.ts 中 local 类型的处理）
        if (relativePath.startsWith('//')) {
          relativePath = relativePath.slice(1);
        }
        // 移除单个前导斜杠
        else if (relativePath.startsWith('/')) {
          relativePath = relativePath.slice(1);
        }

        // Windows 路径转换
        relativePath = relativePath.replace(/\\/g, '/');

        // skillPath 应该指向 SKILL.md 文件（而不是目录）
        // 空路径表示 SKILL.md 在根目录，直接用 'SKILL.md'
        const skillPath = relativePath ? relativePath + '/SKILL.md' : 'SKILL.md';

        let entry: SkillEntry;

        if (parsed.sourceType === 'github' || parsed.sourceType === 'git') {
          if (parsed.mode === 'tag') {
            entry = {
              source: parsed.source,
              sourceType: parsed.sourceType,
              sourceUrl: parsed.sourceUrl,
              mode: 'tag',
              tag: parsed.version!,
              skillPath: skillPath,
            };
          } else {
            // branch
            entry = {
              source: parsed.source,
              sourceType: parsed.sourceType,
              sourceUrl: parsed.sourceUrl,
              mode: 'branch',
              branch: parsed.branch!,
              commit: parsed.version!,
              skillPath: skillPath,
            };
          }
        } else {
          // NPM 或 Local 类型
          const npmEntry: any = {
            source: parsed.source,
            sourceType: parsed.sourceType,
            sourceUrl: parsed.sourceUrl,
            version: parsed.version!,
            skillPath: skillPath,
          };

          // 如果指定了 registry，添加到 entry 中
          if (parsed.registry) {
            npmEntry.registry = parsed.registry;
          }

          entry = npmEntry;
        }

        // 检查是否已存在
        if (skill.name in currentSkills.skills) {
          if (!options.yes) {
            const overwrite = await p.confirm({
              message: `Skill "${skill.name}" already exists. Overwrite?`,
            });

            if (isCancelled(overwrite) || !overwrite) {
              results.push({ skill, success: false, error: 'Skipped' });
              continue;
            }
          }
        }

        await addSkill(skill.name, entry, global);
        results.push({ skill, success: true });
      } catch (error) {
        results.push({
          skill,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 8. 结果汇总
    const success = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (success.length > 0) {
      const location = global ? `~/.agents/apm.json` : `.agents/apm.json`;
      p.log.success(pc.green(`Added ${success.length} skill${success.length > 1 ? 's' : ''} to ${location}`));
      for (const r of success) {
        p.log.message(`  ${pc.green('✓')} ${r.skill.name}`);
      }
    }

    if (failed.length > 0) {
      p.log.error(pc.red(`Failed ${failed.length} skill${failed.length > 1 ? 's' : ''}`));
      for (const r of failed) {
        p.log.message(`  ${pc.red('✗')} ${r.skill.name}: ${pc.dim(r.error)}`);
      }
    }

    // 自动安装技能
    if (success.length > 0) {
      const addedNames = success.map((r) => r.skill.name);
      if (!tempDir) {
        throw new Error('Temporary source directory is missing before install');
      }

      try {
        // 从 apm.json 读取 agents 配置
        const currentSkillsJson = await readSkillsJson(global);
        const additionalAgents = currentSkillsJson.additionalAgents || getDefaultAdditionalAgents();
        const targetAgents = ['universal', ...additionalAgents.map((a) => a.name)];

        // 调用 installCommand（internal 模式，不显示 intro）
        await installCommand({
          internal: true,
          skills: addedNames,
          agents: targetAgents,
          global,
          prefetchedSourceDir: tempDir,
        });
      } catch (error) {
        // 安装失败不影响添加成功
        p.log.error(error instanceof Error ? error.message : String(error));
        p.outro(pc.red('Some skills failed to install'));
        process.exit(1);
      } finally {
        await cleanupTempDir(parsed.sourceType, tempDir);
      }
    } else {
      // 没有成功添加任何技能
      await cleanupTempDir(parsed.sourceType, tempDir);
      p.outro(pc.red('No skills were added'));
      process.exit(1);
    }

    // 确保程序退出，清理 clack UI
    process.exit(0);
  } catch (error) {
    spinner.stop();
    p.log.error(pc.red('Failed to discover skills'));
    p.log.error(error instanceof Error ? error.message : String(error));
    await cleanupTempDir(parsed.sourceType, tempDir);
    process.exit(1);
  }
}
