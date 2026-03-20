/**
 * list 命令实现
 * 列出 apm.json 中的所有技能
 */

import Table from 'cli-table3';
import { existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { getConfiguredAgents, resolveAgentSkillsDir } from '../agents.js';
import { readSkillsJson } from '../skills-json';
import { showLogo } from '../logo.js';
import type { AgentConfigEntry, ListOptions } from '../types';

/**
 * 技能安装状态
 */
interface SkillStatus {
  name: string;
  installed: 'full' | 'partial' | 'none';
  path: string;
  missingAgents?: string[]; // 缺失的 agent 列表
}

/**
 * 格式化 source 显示
 */
function formatSource(entry: { source: string; sourceType: string; sourceUrl: string }): string {
  // git 类型显示完整的 sourceUrl（因为不同 git 源链接格式可能不一致）
  if (entry.sourceType === 'git') {
    return pc.dim(entry.sourceUrl);
  }
  // npm 类型显示 source
  return entry.source;
}

/**
 * 格式化 version 显示
 * 按照 git log 标准显示：tag 直接显示，branch 显示为 branch@commit缩写
 */
function formatVersion(entry: { mode?: string; version?: string; sourceType?: string }): string {
  // 对于 Tag 模式 - 直接显示 tag 名
  if (entry.mode === 'tag') {
    return pc.yellow((entry as any).tag);
  }

  // 对于 Branch 模式 - 显示为 branch@commit缩写（7 字符，符合 git log 标准）
  if (entry.mode === 'branch') {
    const branch = String((entry as any).branch || '-');
    const commit = (entry as any).commit;
    if (!commit) {
      return pc.yellow(branch);
    }
    const shortCommit = String(commit).slice(0, 7); // git log 标准格式
    return pc.yellow(`${branch}@${shortCommit}`);
  }

  // 对于 NPM 模式
  if (entry.sourceType === 'npm') {
    return pc.yellow(entry.version);
  }

  // 对于 Local 模式
  if (entry.sourceType === 'local') {
    return pc.dim('-');
  }

  // 默认情况
  return pc.dim('-');
}

/**
 * 检查技能是否已安装
 *
 * @param name - 技能名称
 * @param global - 是否为全局模式
 * @returns 技能状态
 */
function checkSkillInstalled(name: string, agents: AgentConfigEntry[], global = false): SkillStatus {
  const agentPaths = agents.map((agent) => ({
    name: agent.name,
    path: join(resolveAgentSkillsDir(agent, global), name),
  }));

  // 检查每个 agent 的安装状态
  const missingAgents: string[] = [];
  let universalExists = false;

  for (const agent of agentPaths) {
    const exists = existsSync(agent.path);
    if (agent.name === 'universal') {
      universalExists = exists;
    }
    if (!exists) {
      missingAgents.push(agent.name);
    }
  }

  // 确定安装状态
  let installed: 'full' | 'partial' | 'none';
  if (!universalExists) {
    installed = 'none';
  } else if (missingAgents.length === 0) {
    installed = 'full';
  } else {
    installed = 'partial';
  }

  return {
    name,
    installed,
    path: agentPaths.find((agent) => agent.name === 'universal')!.path,
    missingAgents: missingAgents.length > 0 ? missingAgents : undefined,
  };
}

/**
 * 获取技能状态图标
 *
 * @param installed - 安装状态
 * @returns 状态图标
 */
function getStatusIcon(installed: 'full' | 'partial' | 'none'): string {
  switch (installed) {
    case 'full':
      return '✅';
    case 'partial':
      return '⚠️';
    case 'none':
      return '❌';
  }
}

/**
 * 执行 list 命令
 *
 * @param options - 命令选项
 */
export async function listCommand(options: ListOptions = {}): Promise<void> {
  const { global = false } = options;

  showLogo();
  const skillsJson = await readSkillsJson(global);
  const agents = getConfiguredAgents(skillsJson.additionalAgents);
  const skills = Object.entries(skillsJson.skills);

  const configLocation = global ? '~/.agents/apm.json' : 'apm.json';

  if (skills.length === 0) {
    console.log(pc.yellow(`No skills in ${configLocation}`));
    console.log(pc.dim(`Run "skills add <source>${global ? ' -g' : ''}" to add skills`));
    return;
  }

  // 检查所有技能的安装状态
  const skillStatuses: SkillStatus[] = skills.map(([name]) => checkSkillInstalled(name, agents, global));

  // 统计有问题的技能（未安装或部分安装）
  const problematicSkills = skillStatuses.filter((s) => s.installed !== 'full');

  // 创建表格（添加 STATUS 列）
  const table = new Table({
    head: [pc.dim('STATUS'), pc.dim('NAME'), pc.dim('TYPE'), pc.dim('SOURCE'), pc.dim('VERSION')],
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
      mid: '─',
      'mid-mid': '─',
      right: '',
      'right-mid': '',
      middle: ' ',
    },
  });

  // 填充表格数据
  for (const [name, entry] of skills) {
    const status = skillStatuses.find((s) => s.name === name)!;
    const statusIcon = getStatusIcon(status.installed);

    table.push([statusIcon, pc.cyan(name), pc.cyan(entry.sourceType), formatSource(entry), formatVersion(entry)]);

    // verbose 模式显示额外信息
    if (options.verbose) {
      table.push([
        {
          content: `${pc.dim('path:')} ${entry.skillPath}`,
          colSpan: 5,
        },
      ]);
      table.push([
        {
          content: `${pc.dim('installed at:')} ${status.path}`,
          colSpan: 5,
        },
      ]);

      // 如果有缺失的 agents，显示详细信息
      if (status.missingAgents && status.missingAgents.length > 0) {
        table.push([
          {
            content: `${pc.yellow('Missing in:')} ${status.missingAgents.join(', ')}`,
            colSpan: 5,
          },
        ]);
      }

      table.push([
        {
          content: `${pc.dim('url:')} ${entry.sourceUrl}`,
          colSpan: 4,
        },
      ]);

      // 对于 Tag 模式
      if ('mode' in entry && entry.mode === 'tag') {
        table.push([
          {
            content: `${pc.dim('Type:')} ${pc.cyan('tag')} | ${pc.dim('Tag:')} ${pc.yellow(
              String((entry as any).tag),
            )}`,
            colSpan: 4,
          },
        ]);
      }

      // 对于 Branch 模式
      if ('mode' in entry && entry.mode === 'branch') {
        table.push([
          {
            content: `${pc.dim('Type:')} ${pc.cyan('branch')} | ${pc.dim('Branch:')} ${pc.yellow(
              String((entry as any).branch),
            )} | ${pc.dim('Commit:')} ${pc.dim(String((entry as any).commit))}`,
            colSpan: 4,
          },
        ]);
      }

      // 对于 NPM 模式
      if (entry.sourceType === 'npm') {
        table.push([
          {
            content: `${pc.dim('Type:')} ${pc.cyan(entry.sourceType)} | ${pc.dim('Version:')} ${pc.yellow(
              String(entry.version),
            )}`,
            colSpan: 4,
          },
        ]);
      }

      // 对于 Local 模式
      if (entry.sourceType === 'local') {
        table.push([
          {
            content: `${pc.dim('Type:')} ${pc.cyan('local')}`,
            colSpan: 4,
          },
        ]);
      }

      // 添加空行分隔不同技能
      table.push([
        {
          content: '',
          colSpan: 5,
        },
      ]);
    }
  }

  // 输出表格
  console.log(table.toString());

  // 总结
  console.log(pc.dim(`Total: ${skills.length} skill${skills.length > 1 ? 's' : ''}`));

  // 如果有问题的技能，显示警告
  if (problematicSkills.length > 0) {
    console.log();
    console.log(pc.yellow('⚠ Warning: Some skills have installation issues:'));
    console.log();

    // 创建警告表格
    const warningTable = new Table({
      head: [pc.dim('NAME'), pc.dim('STATUS'), pc.dim('DETAILS')],
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
        mid: '─',
        'mid-mid': '─',
        right: '',
        'right-mid': '',
        middle: ' ',
      },
    });

    for (const skill of problematicSkills) {
      let statusText: string;
      let detailsText: string;

      if (skill.installed === 'none') {
        statusText = pc.red('❌ Not Installed');
        detailsText = pc.dim(`Expected at: ${skill.path}`);
      } else {
        statusText = pc.yellow('⚠️ Partial');
        detailsText = pc.dim(`Missing in: ${skill.missingAgents?.join(', ') || 'N/A'}`);
      }

      warningTable.push([pc.cyan(skill.name), statusText, detailsText]);
    }

    console.log(warningTable.toString());
    console.log();
    console.log(pc.dim(`Run ${pc.yellow(`"skills install${global ? ' -g' : ''}"`)} to fix installation issues.`));
  }
}
