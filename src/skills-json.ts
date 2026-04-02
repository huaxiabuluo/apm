/**
 * apm.json 读写操作
 * 管理 apm.json 文件的读取、写入和修改
 */

import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { getDefaultAdditionalAgents, toPersistedAgentConfig } from './agents.js';
import { APM_JSON_FILE, APM_JSON_VERSION, GLOBAL_APM_DIR, PROJECT_APM_DIR } from './constants.js';
import type { SkillEntry, SkillsJson } from './types.js';

/**
 * 同步获取项目根目录（从 project.ts 复制）
 * 用于 getApmsJsonPath 中
 */
function findProjectRootSync(startPath: string = process.cwd()): string {
  let currentPath = resolve(startPath);
  let previousPath: string | null = null;

  while (currentPath !== previousPath) {
    const gitDir = resolve(currentPath, '.git');

    if (existsSync(gitDir)) {
      return currentPath;
    }

    previousPath = currentPath;
    currentPath = dirname(currentPath);
  }

  return resolve(startPath);
}

/**
 * 获取 apm.json 文件路径
 *
 * @param global - 是否使用全局路径
 * @returns apm.json 文件的完整路径
 */
export function getApmsJsonPath(global = false): string {
  if (global) {
    return join(GLOBAL_APM_DIR, APM_JSON_FILE);
  }
  // 项目模式：使用 .agents/apm.json
  return join(findProjectRootSync(), PROJECT_APM_DIR, APM_JSON_FILE);
}
/**
 * 创建空的 apm.json 结构
 */
function createEmptySkillsJson(): SkillsJson {
  return {
    version: APM_JSON_VERSION,
    additionalAgents: getDefaultAdditionalAgents().map(toPersistedAgentConfig),
    skills: {},
  };
}

/**
 * 读取 apm.json
 * 文件不存在时返回空结构
 *
 * @param global - 是否读取全局配置（默认为 false）
 * @returns 解析后的 apm.json 对象
 */
export async function readSkillsJson(global = false): Promise<SkillsJson> {
  const filePath = await getApmsJsonPath(global);

  try {
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as SkillsJson;

    // 验证版本
    if (data.version !== APM_JSON_VERSION) {
      throw new Error(`Unsupported apm.json version: ${data.version}. Expected: ${APM_JSON_VERSION}`);
    }

    return data;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    if (err.code === 'ENOENT') {
      // 文件不存在，返回空结构
      return createEmptySkillsJson();
    }

    if (err instanceof SyntaxError) {
      throw new Error(`Invalid apm.json format: ${err.message}`);
    }

    throw error;
  }
}

/**
 * 写入 apm.json
 *
 * @param data - 要写入的数据
 * @param global - 是否写入全局配置（默认为 false）
 */
export async function writeSkillsJson(data: SkillsJson, global = false): Promise<void> {
  const filePath = await getApmsJsonPath(global);

  // 确保目录存在
  await mkdir(dirname(filePath), { recursive: true });

  // 格式化写入（2 空格缩进）
  const content = JSON.stringify(data, null, 2);
  await writeFile(filePath, content, 'utf-8');
}

/**
 * 移除技能
 *
 * @param name - 技能名称
 * @param global -是否操作全局配置（默认为 false）
 * @returns 是否成功移除（false 表示技能不存在）
 */
export async function removeSkill(name: string, global = false): Promise<boolean> {
  const data = await readSkillsJson(global);

  if (!(name in data.skills)) {
    return false;
  }

  delete data.skills[name];
  await writeSkillsJson(data, global);
  return true;
}

/**
 * 获取技能条目
 *
 * @param name - 技能名称
 * @param global - 是否从全局配置读取（默认为 false）
 * @returns 技能条目，不存在时返回 null
 */
export async function getSkill(name: string, global = false): Promise<SkillEntry | null> {
  const data = await readSkillsJson(global);
  return data.skills[name] ?? null;
}

/**
 * 获取所有技能
 *
 * @param global - 是否从全局配置读取（默认为 false）
 * @returns 技能名称到条目的映射
 */
export async function getAllSkills(global = false): Promise<Record<string, SkillEntry>> {
  const data = await readSkillsJson(global);
  return data.skills;
}
