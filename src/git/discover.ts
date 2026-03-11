/**
 * SKILL.md 发现逻辑
 * 在 Git 仓库中查找 SKILL.md 文件
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import type { ParsedSource } from '../types.js';
import { cleanup, cloneRepo, getLatestCommit } from './clone.js';

/**
 * 跳过探索的目录名
 */
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
 * 判断目录是否应该探索
 */
function shouldExplore(name: string): boolean {
  return !SKIP_DIRECTORIES.has(name) && !name.startsWith('.');
}

/**
 * 在目录中查找 SKILL.md
 * 使用广度优先搜索
 *
 * @param repoPath - 仓库根目录
 * @returns SKILL.md 相对于仓库根目录的路径
 */
async function findSkillMd(repoPath: string): Promise<string> {
  const queue: string[] = [''];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentPath = join(repoPath, current);

    // 防止循环
    if (visited.has(currentPath)) {
      continue;
    }
    visited.add(currentPath);

    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === 'SKILL.md') {
          // 找到了！返回相对于仓库根目录的路径
          return current ? `${current}/SKILL.md` : 'SKILL.md';
        }

        if (entry.isDirectory() && shouldExplore(entry.name)) {
          queue.push(join(current, entry.name));
        }
      }
    } catch {
      // 忽略无法读取的目录
    }
  }

  throw new Error('SKILL.md not found in repository');
}

/**
 * 发现 Git 仓库中的 SKILL.md 路径
 *
 * @param parsed - 解析后的源信息
 * @returns SKILL.md 相对于仓库根目录的路径
 */
export async function discoverGitSkillPath(parsed: ParsedSource): Promise<string> {
  let tempDir: string | null = null;

  try {
    // 1. 克隆仓库
    tempDir = await cloneRepo(parsed.sourceUrl, parsed.version);

    // 2. 如果未指定版本，获取最新 commit 和分支名
    if (!parsed.version) {
      const { getCurrentBranch } = await import('./clone.js');
      const currentBranch = await getCurrentBranch(tempDir);
      const latestCommit = await getLatestCommit(tempDir);
      parsed.mode = 'branch';
      parsed.branch = currentBranch;
      parsed.version = latestCommit;
    }

    // 3. 查找 SKILL.md
    const skillPath = await findSkillMd(tempDir);

    return skillPath;
  } finally {
    if (tempDir) {
      await cleanup(tempDir);
    }
  }
}
