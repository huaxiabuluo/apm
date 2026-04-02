/**
 * skills CLI 入口
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';

// 命令导入
import { addCommand } from './commands/add.js';
import { checkCommand } from './commands/check.js';
import { initCommand } from './commands/init.js';
import { installCommand } from './commands/install.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';
import { updateCommand } from './commands/update.js';
import { VERSION } from './version.js';

// 类型导入
import type {
  AddOptions,
  CheckOptions,
  InitOptions,
  InstallOptions,
  ListOptions,
  RemoveOptions,
  UpdateOptions,
} from './types.js';

type CliCommand = 'init' | 'add' | 'install' | 'list' | 'remove' | 'check' | 'update' | 'version';

interface ParsedAddArgs {
  source?: string;
  options: AddOptions;
  unknownOption?: string;
}

function isHelpFlag(arg: string): boolean {
  return arg === '-h' || arg === '--help';
}

function hasHelpFlag(args: string[]): boolean {
  return args.some(isHelpFlag);
}

function isVersionFlag(arg: string): boolean {
  return arg === '-v' || arg === '--version';
}

function normalizeCommand(command: string): CliCommand | undefined {
  switch (command) {
    case 'init':
    case 'add':
    case 'install':
    case 'list':
    case 'remove':
    case 'check':
    case 'update':
    case 'version':
      return command;
    case 'i':
      return 'install';
    case 'ls':
      return 'list';
    case 'rm':
      return 'remove';
    default:
      return undefined;
  }
}

/**
 * 显示帮助信息
 */
function showGlobalHelp() {
  console.log();
  console.log(pc.bgCyan(pc.black(' apm ')));
  console.log();
  console.log(pc.bold('Usage:'));
  console.log(`  ${pc.cyan('apm <command>')} [options]`);
  console.log(`  ${pc.cyan('apm --help')}`);
  console.log(`  ${pc.cyan('apm --version')}`);
  console.log();
  console.log(pc.bold('Commands:'));
  console.log(`  ${pc.cyan('init')}     Initialize apm.json configuration`);
  console.log(`  ${pc.cyan('add')}      Add a skill to apm.json`);
  console.log(`  ${pc.cyan('install')}  Install all skills from apm.json (${pc.dim('alias: i')})`);
  console.log(`  ${pc.cyan('list')}     List all skills in apm.json (${pc.dim('alias: ls')})`);
  console.log(`  ${pc.cyan('remove')}   Remove skills from apm.json (${pc.dim('alias: rm')})`);
  console.log(`  ${pc.cyan('check')}    Check for skill updates`);
  console.log(`  ${pc.cyan('update')}   Update skills to latest versions`);
  console.log(`  ${pc.cyan('version')}  Show version information`);
  console.log();
  console.log(pc.bold('Source Formats:'));
  console.log(`  ${pc.cyan('github:owner/repo[@<version>]')}    GitHub shorthand for a Git repository`);
  console.log(`  ${pc.cyan('git:<url>[@<version>]')}            Git repository`);
  console.log(`  ${pc.cyan('npm:<package>[@<version>][?registry=<url>]')}  NPM package`);
  console.log();
  console.log(pc.bold('Help:'));
  console.log(`  ${pc.cyan('apm <command> --help')}   Show help for a specific command`);
  console.log();
  console.log(pc.bold('Version Syntax:'));
  console.log(`  ${pc.cyan('(none)')}           Use the default branch`);
  console.log(`  ${pc.cyan('@tag:<version>')}   Tag reference`);
  console.log(`  ${pc.cyan('@branch:<name>')}   Branch reference`);
  console.log(`  ${pc.cyan('@<version>')}       NPM version (NPM sources only)`);
  console.log();
  console.log(pc.dim('Git/GitHub examples:'));
  console.log(`  ${pc.dim('github: is shorthand for git: targeting GitHub')} `);
  console.log(`  ${pc.dim('github:anthropics/skills')}         (default branch)`);
  console.log(`  ${pc.dim('github:vercel-labs/skills@tag:v1.4.4')}  (tag)`);
  console.log(`  ${pc.dim('github:anthropics/skills@branch:main')}  (branch)`);
  console.log(`  ${pc.dim('git:git@github.com:vercel-labs/agent-skills.git')}  (SSH URL)`);
  console.log(`  ${pc.dim('git:git@github.com:vercel-labs/agent-skills.git@branch:main')}  (SSH URL + branch)`);
  console.log();
  console.log(pc.dim('NPM examples:'));
  console.log(`  ${pc.dim('npm:@anthropic/skills@1.2.3')}      (version)`);
  console.log(`  ${pc.dim("'npm:@anthropic/skills?registry=https://registry.example.com'")}  (custom registry)`);
  console.log(
    `  ${pc.dim("'npm:@anthropic/skills@1.2.3?registry=https://registry.example.com'")}  (custom registry + version)`,
  );
  console.log();
  console.log(pc.bold('Root Options:'));
  console.log(`  ${pc.yellow('-h, --help')}        Show this help message`);
  console.log(`  ${pc.yellow('-v, --version')}     Show version`);
  console.log();
  console.log(pc.bold('Examples:'));
  console.log(`  ${pc.dim('apm init')}`);
  console.log(`  ${pc.dim('apm init --agent claude-code --agent openclaw')}`);
  console.log(`  ${pc.dim('apm init -g')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills')}`);
  console.log(`  ${pc.dim('apm add -g github:anthropics/skills')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills --skill frontend-design --skill skill-creator')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills --skill "*"')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills --list')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills --no-save')}`);
  console.log(`  ${pc.dim("apm add 'npm:@ai-dancer/apm?registry=https://registry.npmmirror.com/'")}`);
  console.log(`  ${pc.dim('apm install')}`);
  console.log(`  ${pc.dim('apm install --confirm')}`);
  console.log(`  ${pc.dim('apm list')}`);
  console.log(`  ${pc.dim('apm list -g')}`);
  console.log(`  ${pc.dim('apm remove my-skill another-skill')}`);
  console.log(`  ${pc.dim('apm check')}`);
  console.log(`  ${pc.dim('apm check my-skill')}`);
  console.log(`  ${pc.dim('apm update --select')}`);
  console.log(`  ${pc.dim('apm update my-skill --no-install')}`);
  console.log();
}

function showCommandHelp(command: Exclude<CliCommand, 'version'>): void {
  console.log();
  console.log(pc.bgCyan(pc.black(' apm ')));
  console.log();

  switch (command) {
    case 'init':
      console.log(pc.bold('Usage:'));
      console.log(`  ${pc.cyan('apm init')} [options]`);
      console.log();
      console.log(pc.bold('Options:'));
      console.log(`  ${pc.yellow('-a, --agent <name>')}  Select specific agents`);
      console.log(`  ${pc.yellow('-g, --global')}        Use global config and directories (${pc.dim('~/.agents/')})`);
      console.log(`  ${pc.yellow('-h, --help')}          Show help for this command`);
      console.log();
      console.log(pc.bold('Examples:'));
      console.log(`  ${pc.dim('apm init')}`);
      console.log(`  ${pc.dim('apm init --agent claude-code --agent openclaw')}`);
      console.log(`  ${pc.dim('apm init -g')}`);
      console.log();
      return;
    case 'add':
      console.log(pc.bold('Usage:'));
      console.log(`  ${pc.cyan('apm add')} [options] <source>`);
      console.log(`  ${pc.cyan('apm add')} <source> [options]`);
      console.log();
      console.log(pc.dim('Options can appear before or after the source argument.'));
      console.log();
      console.log(pc.bold('Options:'));
      console.log(`  ${pc.yellow('-g, --global')}        Use global config and directories (${pc.dim('~/.agents/')})`);
      console.log(`  ${pc.yellow('-y, --yes')}           Skip confirmation prompts`);
      console.log(`  ${pc.yellow('-s, --skill <name>')}  Select specific skills to install`);
      console.log(`  ${pc.yellow('-l, --list')}          List available skills without installing`);
      console.log(`  ${pc.yellow('--no-save')}           Install skills without saving to apm.json`);
      console.log(`  ${pc.yellow('-h, --help')}          Show help for this command`);
      console.log();
      console.log(pc.bold('Examples:'));
      console.log(`  ${pc.dim('apm add github:anthropics/skills')}`);
      console.log(`  ${pc.dim('apm add -g github:anthropics/skills')}`);
      console.log(`  ${pc.dim('apm add github:anthropics/skills --skill frontend-design --skill skill-creator')}`);
      console.log(`  ${pc.dim('apm add github:anthropics/skills --list')}`);
      console.log();
      return;
    case 'install':
      console.log(pc.bold('Usage:'));
      console.log(`  ${pc.cyan('apm install')} [options]`);
      console.log(`  ${pc.cyan('apm i')} [options]`);
      console.log();
      console.log(pc.bold('Options:'));
      console.log(`  ${pc.yellow('--confirm')}          Confirm before installing`);
      console.log(`  ${pc.yellow('-g, --global')}       Use global config and directories (${pc.dim('~/.agents/')})`);
      console.log(`  ${pc.yellow('-h, --help')}         Show help for this command`);
      console.log();
      return;
    case 'list':
      console.log(pc.bold('Usage:'));
      console.log(`  ${pc.cyan('apm list')} [options]`);
      console.log(`  ${pc.cyan('apm ls')} [options]`);
      console.log();
      console.log(pc.bold('Options:'));
      console.log(`  ${pc.yellow('-v, --verbose')}      Show detailed information`);
      console.log(`  ${pc.yellow('-g, --global')}       Use global config and directories (${pc.dim('~/.agents/')})`);
      console.log(`  ${pc.yellow('-h, --help')}         Show help for this command`);
      console.log();
      return;
    case 'remove':
      console.log(pc.bold('Usage:'));
      console.log(`  ${pc.cyan('apm remove')} [options] <skill-name> [<skill-name>...]`);
      console.log(`  ${pc.cyan('apm rm')} [options] <skill-name> [<skill-name>...]`);
      console.log();
      console.log(pc.bold('Options:'));
      console.log(`  ${pc.yellow('-y, --yes')}          Skip confirmation prompts`);
      console.log(`  ${pc.yellow('-g, --global')}       Use global config and directories (${pc.dim('~/.agents/')})`);
      console.log(`  ${pc.yellow('-h, --help')}         Show help for this command`);
      console.log();
      return;
    case 'check':
      console.log(pc.bold('Usage:'));
      console.log(`  ${pc.cyan('apm check')} [options] [skill-name...]`);
      console.log();
      console.log(pc.bold('Options:'));
      console.log(`  ${pc.yellow('-g, --global')}       Use global config and directories (${pc.dim('~/.agents/')})`);
      console.log(`  ${pc.yellow('-h, --help')}         Show help for this command`);
      console.log();
      return;
    case 'update':
      console.log(pc.bold('Usage:'));
      console.log(`  ${pc.cyan('apm update')} [options] [skill-name...]`);
      console.log();
      console.log(pc.bold('Options:'));
      console.log(`  ${pc.yellow('--select')}           Select skills interactively`);
      console.log(`  ${pc.yellow('--no-install')}       Skip installation after updating`);
      console.log(`  ${pc.yellow('-g, --global')}       Use global config and directories (${pc.dim('~/.agents/')})`);
      console.log(`  ${pc.yellow('-h, --help')}         Show help for this command`);
      console.log();
      return;
  }
}

function showHelp(command?: CliCommand): void {
  if (!command) {
    showGlobalHelp();
    return;
  }

  if (command === 'version') {
    showVersion();
    return;
  }

  showCommandHelp(command);
}

function parseHelpCommand(args: string[]): CliCommand | undefined {
  if (args.length === 0) {
    return undefined;
  }

  return normalizeCommand(args[0]!);
}

/**
 * 显示版本信息
 */
function showVersion() {
  console.log(VERSION);
}

/**
 * 解析 add 命令选项
 */
function parseAddArgs(args: string[]): ParsedAddArgs {
  const options: AddOptions = {
    skill: [],
  };
  let source: string | undefined;
  let unknownOption: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-y' || arg === '--yes') {
      options.yes = true;
    } else if (arg === '-l' || arg === '--list') {
      options.list = true;
    } else if (arg === '--no-save') {
      options.noSave = true;
    } else if (arg === '-g' || arg === '--global') {
      options.global = true;
    } else if (arg === '-s' || arg === '--skill') {
      // 收集 --skill 后面的所有参数
      i++;
      while (i < args.length && !args[i]!.startsWith('-')) {
        options.skill!.push(args[i++]!);
      }
      i--; // 回退一个位置
    } else if (!arg.startsWith('-') && source === undefined) {
      source = arg;
    } else if (arg.startsWith('-')) {
      unknownOption = arg;
      break;
    }
  }

  return { source, options, unknownOption };
}

/**
 * 解析 install 命令选项
 */
function parseInstallOptions(args: string[]): InstallOptions {
  const options: InstallOptions = {};

  for (const arg of args) {
    if (arg === '--confirm') {
      options.confirm = true;
    } else if (arg === '-g' || arg === '--global') {
      options.global = true;
    }
  }

  return options;
}

/**
 * 解析 list 命令选项
 */
function parseListOptions(args: string[]): ListOptions {
  const options: ListOptions = {};

  for (const arg of args) {
    if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '-g' || arg === '--global') {
      options.global = true;
    }
  }

  return options;
}

/**
 * 解析 remove 命令选项
 */
function parseRemoveOptions(args: string[]): RemoveOptions {
  const options: RemoveOptions = {};

  for (const arg of args) {
    if (arg === '-y' || arg === '--yes') {
      options.yes = true;
    } else if (arg === '-g' || arg === '--global') {
      options.global = true;
    }
  }

  return options;
}

/**
 * 解析 check 命令选项
 */
function parseCheckOptions(args: string[]): CheckOptions {
  const options: CheckOptions = {};

  // 收集非选项参数作为技能名称
  const skills: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-g' || arg === '--global') {
      options.global = true;
    } else if (arg.startsWith('-')) {
      // 跳过选项参数（目前 check 命令没有选项，但预留扩展空间）
      continue;
    } else {
      skills.push(arg);
    }
  }

  if (skills.length > 0) {
    options.skills = skills;
  }

  return options;
}

/**
 * 解析 update 命令选项
 */
function parseUpdateOptions(args: string[]): UpdateOptions {
  const options: UpdateOptions = {};

  // 收集非选项参数作为技能名称
  const skills: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--select') {
      options.select = true;
    } else if (arg === '--no-install') {
      options.noInstall = true;
    } else if (arg === '-g' || arg === '--global') {
      options.global = true;
    } else if (!arg.startsWith('-')) {
      skills.push(arg);
    }
  }

  if (skills.length > 0) {
    options.skills = skills;
  }

  return options;
}

/**
 * 解析 init 命令选项
 */
function parseInitOptions(args: string[]): InitOptions {
  const options: InitOptions = {};

  // 收集指定的 agents
  const agents: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-a' || arg === '--agent') {
      // 收集 --agent 后面的所有参数
      i++;
      while (i < args.length && !args[i]!.startsWith('-')) {
        agents.push(args[i++]!);
      }
      i--; // 回退一个位置
    } else if (arg === '-g' || arg === '--global') {
      options.global = true;
    }
  }

  if (agents.length > 0) {
    options.agents = agents;
  }

  return options;
}

/**
 * 主函数
 */
export async function main(args: string[] = process.argv.slice(2)) {
  // 解析命令行参数
  if (args.length === 0) {
    showHelp();
    return;
  }

  if (isHelpFlag(args[0]!)) {
    showHelp();
    return;
  }

  if (args[0] === 'help') {
    const helpCommand = parseHelpCommand(args.slice(1));
    if (args.length > 1 && !helpCommand) {
      p.log.error(pc.red(`Unknown command: ${args[1]}`));
      console.log();
      showHelp();
      process.exit(1);
    }

    showHelp(helpCommand);
    return;
  }

  if (isVersionFlag(args[0]!)) {
    showVersion();
    return;
  }

  const command = normalizeCommand(args[0]!);

  if (!command) {
    p.log.error(pc.red(`Unknown command: ${args[0]}`));
    console.log();
    showHelp();
    process.exit(1);
  }

  switch (command) {
    case 'init': {
      if (hasHelpFlag(args.slice(1))) {
        showHelp('init');
        return;
      }
      const options = parseInitOptions(args.slice(1));
      await initCommand(options);
      break;
    }

    case 'add': {
      if (hasHelpFlag(args.slice(1))) {
        showHelp('add');
        return;
      }

      const { source, options, unknownOption } = parseAddArgs(args.slice(1));
      if (unknownOption) {
        p.log.error(pc.red(`Unknown option for add: ${unknownOption}`));
        p.log.message(pc.dim('Usage: apm add [options] <source>'));
        p.log.message(pc.dim('Run "apm add --help" for supported options.'));
        process.exit(1);
      }
      if (!source) {
        p.log.error(pc.red('Missing source argument'));
        p.log.message(pc.dim('Usage: apm add <source> [options]'));
        p.log.message(pc.dim('Example: apm add github:vercel-labs/skills@tag:v1.4.4'));
        process.exit(1);
      }

      await addCommand(source, options);
      break;
    }

    case 'install': {
      if (hasHelpFlag(args.slice(1))) {
        showHelp('install');
        return;
      }
      const options = parseInstallOptions(args.slice(1));
      await installCommand(options);
      break;
    }

    case 'list': {
      if (hasHelpFlag(args.slice(1))) {
        showHelp('list');
        return;
      }
      const options = parseListOptions(args.slice(1));
      await listCommand(options);
      break;
    }

    case 'remove': {
      if (hasHelpFlag(args.slice(1))) {
        showHelp('remove');
        return;
      }
      const skillNames = args.slice(1).filter((arg) => !arg.startsWith('-'));
      if (skillNames.length === 0) {
        p.log.error(pc.red('Missing skill name argument'));
        p.log.message(pc.dim('Usage: apm remove <skill-name>'));
        process.exit(1);
      }

      const options = parseRemoveOptions(args.slice(1));
      await removeCommand(skillNames, options);
      break;
    }

    case 'check': {
      if (hasHelpFlag(args.slice(1))) {
        showHelp('check');
        return;
      }
      const options = parseCheckOptions(args.slice(1));
      await checkCommand(options);
      break;
    }

    case 'update': {
      if (hasHelpFlag(args.slice(1))) {
        showHelp('update');
        return;
      }
      const options = parseUpdateOptions(args.slice(1));
      await updateCommand(options);
      break;
    }

    case 'version':
      showVersion();
      break;
  }
}
