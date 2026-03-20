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

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log();
  console.log(pc.bgCyan(pc.black(' apm ')));
  console.log();
  console.log(pc.bold('Usage:'));
  console.log(`  ${pc.cyan('apm init')} [options]`);
  console.log(`  ${pc.cyan('apm add')} <source> [options]`);
  console.log(`  ${pc.cyan('apm install')} [options]`);
  console.log(`  ${pc.cyan('apm list')} [options]`);
  console.log(`  ${pc.cyan('apm remove')} <skill-name> [<skill-name>...] [options]`);
  console.log(`  ${pc.cyan('apm check')} [skill-name...] [options]`);
  console.log(`  ${pc.cyan('apm update')} [skill-name...] [options]`);
  console.log(`  ${pc.cyan('apm version')}`);
  console.log(`  ${pc.cyan('apm help')}`);
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
  console.log(`  ${pc.cyan('help')}     Show help information`);
  console.log();
  console.log(pc.bold('Source Formats:'));
  console.log(`  ${pc.cyan('github:owner/repo[@<version>]')}    GitHub shorthand for a Git repository`);
  console.log(`  ${pc.cyan('git:<url>[@<version>]')}            Git repository`);
  console.log(`  ${pc.cyan('npm:<package>[@<version>][?registry=<url>]')}  NPM package`);
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
  console.log(pc.bold('Global Options:'));
  console.log(`  ${pc.yellow('-g, --global')}      Use global config and directories (${pc.dim('~/.agents/')})`);
  console.log(`  ${pc.yellow('-h, --help')}        Show this help message`);
  console.log(`  ${pc.yellow('-v, --version')}     Show version`);
  console.log();
  console.log(pc.bold('Command Options:'));
  console.log(`  ${pc.yellow('init  -a, --agent')}       Select specific agents`);
  console.log(`  ${pc.yellow('add   -y, --yes')}         Skip confirmation prompts`);
  console.log(`  ${pc.yellow('add   -s, --skill')}       Select specific skills to install`);
  console.log(`  ${pc.yellow('add   -l, --list')}        List available skills without installing`);
  console.log(`  ${pc.yellow('add   --no-save')}         Install skills without saving to apm.json`);
  console.log(`  ${pc.yellow('install --confirm')}       Confirm before installing`);
  console.log(`  ${pc.yellow('list  -v, --verbose')}     Show detailed information`);
  console.log(`  ${pc.yellow('remove -y, --yes')}        Skip confirmation prompts`);
  console.log(`  ${pc.yellow('update --select')}         Select skills interactively`);
  console.log(`  ${pc.yellow('update --no-install')}     Skip installation after updating`);
  console.log();
  console.log(pc.bold('Examples:'));
  console.log(`  ${pc.dim('apm init')}`);
  console.log(`  ${pc.dim('apm init --agent claude-code --agent openclaw')}`);
  console.log(`  ${pc.dim('apm init -g')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills --skill frontend-design --skill skill-creator')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills --skill "*"')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills --list')}`);
  console.log(`  ${pc.dim('apm add github:anthropics/skills --no-save')}`);
  console.log(`  ${pc.dim('apm add -g github:anthropics/skills')}`);
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

/**
 * 显示版本信息
 */
function showVersion() {
  console.log();
  console.log(pc.bgCyan(pc.black(' apm ')));
  console.log();
  console.log(pc.dim('Version: 1.0.0'));
  console.log(pc.dim('apm.json format: version 1'));
  console.log();
}

/**
 * 解析 add 命令选项
 */
function parseAddOptions(args: string[]): AddOptions {
  const options: AddOptions = {
    skill: [],
  };

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
    }
  }

  return options;
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
async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'init': {
      const options = parseInitOptions(args.slice(1));
      await initCommand(options);
      break;
    }

    case 'add': {
      const source = args[1];
      if (!source) {
        p.log.error(pc.red('Missing source argument'));
        p.log.message(pc.dim('Usage: apm add <source> [options]'));
        p.log.message(pc.dim('Example: apm add github:vercel-labs/skills@tag:v1.4.4'));
        process.exit(1);
      }

      const options = parseAddOptions(args.slice(2));
      await addCommand(source, options);
      break;
    }

    case 'install':
    case 'i': {
      const options = parseInstallOptions(args.slice(1));
      await installCommand(options);
      break;
    }

    case 'list':
    case 'ls': {
      const options = parseListOptions(args.slice(1));
      await listCommand(options);
      break;
    }

    case 'remove':
    case 'rm': {
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
      const options = parseCheckOptions(args.slice(1));
      await checkCommand(options);
      break;
    }

    case 'update': {
      const options = parseUpdateOptions(args.slice(1));
      await updateCommand(options);
      break;
    }

    case 'help':
    case '-h':
    case '--help':
      showHelp();
      break;

    case 'version':
    case '-v':
    case '--version':
      showVersion();
      break;

    default:
      p.log.error(pc.red(`Unknown command: ${command}`));
      console.log();
      showHelp();
      process.exit(1);
  }
}

/**
 * 处理错误
 */
process.on('unhandledRejection', (error) => {
  if (error instanceof Error) {
    p.log.error(pc.red(error.message));
  } else {
    p.log.error(pc.red(String(error)));
  }
  process.exit(1);
});

// 运行主函数
main().catch((error) => {
  p.log.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
