#!/usr/bin/env node
/**
 * APM CLI 可执行入口
 * 用于 npx 和全局安装
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { main } from '../dist/cli.mjs';

process.on('unhandledRejection', (error) => {
  if (error instanceof Error) {
    p.log.error(pc.red(error.message));
  } else {
    p.log.error(pc.red(String(error)));
  }
  process.exit(1);
});

main().catch((error) => {
  p.log.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
