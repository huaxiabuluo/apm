/**
 * 全局常量定义
 */

import { homedir } from 'os';
import { join } from 'path';

/**
 * 全局 APM 根目录
 */
export const GLOBAL_APM_DIR = join(homedir(), '.agents');

/**
 * 项目模式 APM 目录
 */
export const PROJECT_APM_DIR = '.agents';

/**
 * APM 配置文件名
 */
export const APM_JSON_FILE = 'apm.json';

/**
 * APM 配置文件格式版本
 */
export const APM_JSON_VERSION = 1;
