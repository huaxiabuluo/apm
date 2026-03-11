/**
 * init 命令实现
 * 初始化 apm.json 配置文件
 */

import * as p from '@clack/prompts';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import pc from 'picocolors';
import { findProjectRootSync } from '../project.js';
import { PREDEFINED_AGENTS, getAgentsByNames, toPersistedAgentConfig } from '../agents.js';
import { PROJECT_APM_DIR, APM_JSON_FILE, APM_JSON_VERSION } from '../constants.js';
import type { InitOptions } from '../types.js';
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

/**
 * 执行 init 命令
 *
 * @param options - 命令选项
 */
export async function initCommand(options: InitOptions = {}): Promise<void> {
  const { global = false, agents: specifiedAgents } = options;

  showLogo();
  p.intro(pc.bgCyan(pc.black(' APM (Agent Package Manager) ')));

  // 确定项目根目录
  const projectRoot = global ? undefined : findProjectRootSync();
  const apmDir = global ? join(process.env.HOME!, '.agents') : join(projectRoot!, PROJECT_APM_DIR);
  const apmJsonPath = join(apmDir, APM_JSON_FILE);

  // 检查是否已存在 apm.json
  if (existsSync(apmJsonPath)) {
    const overwrite = await p.confirm({
      message: `apm.json already exists at ${pc.dim(apmJsonPath)}. Overwrite?`,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Init cancelled');
      return;
    }
  }

  // 确定要包含的 additional agents
  let selectedAgents: typeof PREDEFINED_AGENTS;

  if (specifiedAgents && specifiedAgents.length > 0) {
    // 通过 -a/--agent 参数指定，跳过交互式选择
    selectedAgents = getAgentsByNames(specifiedAgents);

    if (selectedAgents.length === 0) {
      p.log.error(pc.red('No valid agents found for the specified names'));
      p.log.info(pc.dim(`Available agents: ${PREDEFINED_AGENTS.map((a) => pc.cyan(a.name)).join(', ')}`));
      p.cancel('Init failed');
      return;
    }

    p.log.message(`Selected agents: ${selectedAgents.map((a) => pc.cyan(a.displayName)).join(', ')}`);
  } else {
    // 交互式选择
    console.log(pc.dim('│'));
    console.log(
      `${pc.dim('│')}  ${pc.dim('─')} ${pc.bold('Universal (.agents/skills) ── always included')} ${pc.dim(
        '─'.repeat(20)
      )}`
    );
    console.log(
      `${pc.dim('│')}    ${pc.dim('Supported Agents:')} ${pc.cyan(
        'Amp, Cline, Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode...'
      )}`
    );
    console.log(pc.dim('│'));
    console.log(`${pc.dim('│')}  ${pc.dim('─')} ${pc.bold('Additional agents')} ${pc.dim('─'.repeat(29))}`);

    const agentChoices = PREDEFINED_AGENTS.map((agent) => ({
      value: agent.name,
      label: `${agent.displayName} ${pc.dim(`(${agent.skillsDir})`)}`,
      // 默认选中 claude-code
      checked: agent.name === 'claude-code',
    }));

    const selectedAgentNames = await multiselect({
      message: 'Which agents do you want to enable?',
      options: agentChoices,
      initialValues: ['claude-code'], // 默认勾选 claude-code
    });

    if (isCancelled(selectedAgentNames)) {
      p.cancel('Init cancelled');
      return;
    }

    selectedAgents = getAgentsByNames(selectedAgentNames as string[]);
    console.log();

    if (selectedAgents.length > 0) {
      p.log.success(
        `Enabled ${selectedAgents.length} agent${selectedAgents.length > 1 ? 's' : ''}: ${selectedAgents
          .map((a) => pc.cyan(a.displayName))
          .join(', ')}`
      );
    } else {
      p.log.info('No additional agents selected');
    }
  }

  // 构建 apm.json 内容
  const apmJsonContent = {
    version: APM_JSON_VERSION,
    ...(selectedAgents.length > 0
      ? {
          additionalAgents: selectedAgents.map(toPersistedAgentConfig),
        }
      : {}),
    skills: {},
  };

  // 确保目录存在
  await mkdir(dirname(apmJsonPath), { recursive: true });

  // 写入 apm.json
  const { writeFile } = await import('fs/promises');
  await writeFile(apmJsonPath, JSON.stringify(apmJsonContent, null, 2) + '\n', 'utf-8');

  console.log();
  p.log.success(`Created ${pc.bold('apm.json')} at ${pc.dim(apmJsonPath)}`);

  if (selectedAgents.length > 0) {
    console.log();
    p.log.message('Additional agents:');
    for (const agent of selectedAgents) {
      p.log.message(`  ${pc.cyan('•')} ${pc.bold(agent.displayName)} ${pc.dim(`(${agent.skillsDir})`)}`);
    }
  }

  console.log();
  p.outro(pc.green(`Successfully initialized APM! Run ${pc.yellow('apm add <source>')} to add skills.`));
}
