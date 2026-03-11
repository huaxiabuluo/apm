/**
 * 项目根目录查找
 * 通过查找 .git 目录来确定项目根目录
 */

import { existsSync } from 'fs';
import { dirname, resolve } from 'path';

/**
 * 同步查找项目根目录
 *
 * @param startPath - 开始搜索的路径，默认为当前工作目录
 * @returns 项目根目录的绝对路径
 */
export function findProjectRootSync(startPath: string = process.cwd()): string {
  let currentPath = resolve(startPath);
  let previousPath: string | null = null;

  // 防止无限循环：当到达文件系统根目录时停止
  while (currentPath !== previousPath) {
    const gitDir = resolve(currentPath, '.git');

    // 检查 .git 是否存在（可能是目录或文件，用于 git worktrees）
    if (existsSync(gitDir)) {
      return currentPath;
    }

    // 向上一级目录移动
    previousPath = currentPath;
    currentPath = dirname(currentPath);
  }

  // 未找到 .git 目录，返回原始路径
  // 这允许工具在非 git 目录中工作
  return resolve(startPath);
}

/**
 * 查找项目根目录
 * 从指定路径开始向上搜索，直到找到 .git 目录或到达文件系统根
 *
 * @param startPath - 开始搜索的路径，默认为当前工作目录
 * @returns 项目根目录的绝对路径
 */
export async function findProjectRoot(startPath: string = process.cwd()): Promise<string> {
  return findProjectRootSync(startPath);
}
