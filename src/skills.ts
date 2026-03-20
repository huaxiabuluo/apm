/**
 * Skills 发现和解析模块
 */

import { readdir, readFile, stat } from 'fs/promises';
import matter from 'gray-matter';
import { basename, dirname, join } from 'path';
import type { Skill } from './types.js';

/** 跳过搜索的目录 */
const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__tests__',
  'test',
  'tests',
  '.next',
  'out',
  'coverage',
  '.vscode',
  '.idea',
]);

/**
 * 解析 SKILL.md 文件
 *
 * @param skillMdPath - SKILL.md 文件路径
 * @returns 解析后的技能对象，解析失败返回 null
 */
export async function parseSkillMd(skillMdPath: string): Promise<Skill | null> {
  try {
    const content = await readFile(skillMdPath, 'utf-8');
    const { data } = matter(content);

    // 验证必需字段
    if (!data.name || !data.description) {
      return null;
    }

    return {
      name: data.name,
      description: data.description,
      path: dirname(skillMdPath),
      rawContent: content,
      metadata: data.metadata || {},
    };
  } catch {
    return null;
  }
}

/**
 * 检查目录是否存在 SKILL.md
 *
 * @param dir - 目录路径
 * @returns 是否存在 SKILL.md
 */
async function hasSkillMd(dir: string): Promise<boolean> {
  try {
    const skillPath = join(dir, 'SKILL.md');
    const stats = await stat(skillPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * 递归查找包含 SKILL.md 的目录
 *
 * @param dir - 起始目录
 * @param depth - 当前深度
 * @param maxDepth - 最大深度
 * @returns 包含 SKILL.md 的目录路径列表
 */
async function findSkillDirs(dir: string, depth = 0, maxDepth = 5): Promise<string[]> {
  if (depth > maxDepth) return [];

  try {
    const [hasSkill, entries] = await Promise.all([
      hasSkillMd(dir),
      readdir(dir, { withFileTypes: true }).catch(() => []),
    ]);

    const currentDir = hasSkill ? [dir] : [];

    // 并行搜索子目录
    const subDirResults = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !SKIP_DIRECTORIES.has(entry.name))
        .map((entry) => findSkillDirs(join(dir, entry.name), depth + 1, maxDepth)),
    );

    return [...currentDir, ...subDirResults.flat()];
  } catch {
    return [];
  }
}

/**
 * 发现仓库中的所有技能
 *
 * @param repoPath - 仓库根目录
 * @returns 技能列表
 */
export async function discoverSkills(repoPath: string): Promise<Skill[]> {
  const skills: Skill[] = [];
  const seenNames = new Set<string>();

  // 1. 优先搜索常见的技能目录
  const prioritySearchDirs = [
    repoPath,
    join(repoPath, 'skills'),
    join(repoPath, 'skills/.curated'),
    join(repoPath, 'skills/.experimental'),
    join(repoPath, 'skills/.system'),
    join(repoPath, '.agent/skills'),
    join(repoPath, '.agents/skills'),
    join(repoPath, '.claude/skills'),
  ];

  // 2. 搜索优先目录
  for (const dir of prioritySearchDirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillDir = join(dir, entry.name);
          if (await hasSkillMd(skillDir)) {
            const skill = await parseSkillMd(join(skillDir, 'SKILL.md'));
            if (skill && !seenNames.has(skill.name)) {
              skills.push(skill);
              seenNames.add(skill.name);
            }
          }
        }
      }
    } catch {
      // 目录不存在，跳过
    }
  }

  // 3. 如果没找到，递归搜索
  if (skills.length === 0) {
    const allSkillDirs = await findSkillDirs(repoPath);

    for (const skillDir of allSkillDirs) {
      const skill = await parseSkillMd(join(skillDir, 'SKILL.md'));
      if (skill && !seenNames.has(skill.name)) {
        skills.push(skill);
        seenNames.add(skill.name);
      }
    }
  }

  return skills;
}

/**
 * 根据名称过滤技能（不区分大小写）
 *
 * @param skills - 技能列表
 * @param names - 要过滤的名称列表
 * @returns 过滤后的技能列表
 */
export function filterSkills(skills: Skill[], names: string[]): Skill[] {
  const normalizedNames = names.map((n) => n.toLowerCase());

  return skills.filter((skill) => {
    const name = skill.name.toLowerCase();
    return normalizedNames.some((input) => name === input);
  });
}

/**
 * 获取技能显示名称
 *
 * @param skill - 技能对象
 * @returns 显示名称
 */
export function getSkillDisplayName(skill: Skill): string {
  return skill.name || basename(skill.path);
}
