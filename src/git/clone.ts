/**
 * Git 仓库克隆操作
 */

import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { gitP, type SimpleGit } from 'simple-git';

const CLONE_TIMEOUT_MS = 60000; // 60 秒超时

/**
 * 清理临时目录
 *
 * @param dir - 要清理的目录路径
 */
export async function cleanup(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true }).catch(() => {
    // 忽略清理错误
  });
}

/**
 * 克隆 Git 仓库到临时目录
 *
 * @param url - 仓库 URL
 * @param ref - 可选的分支/标签引用
 * @returns 临时目录路径
 */
export async function cloneRepo(url: string, ref?: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'skills-v2-'));
  const git: SimpleGit = gitP({ timeout: { block: CLONE_TIMEOUT_MS } });

  const cloneOptions = ref ? ['--depth', '1', '--branch', ref] : ['--depth', '1'];

  try {
    await git.clone(url, tempDir, cloneOptions);
    return tempDir;
  } catch (error) {
    // 清理临时目录
    await cleanup(tempDir);

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone ${url}: ${errorMessage}`);
  }
}

/**
 * 获取最新 commit SHA
 *
 * @param repoPath - 仓库路径
 * @returns commit SHA
 */
export async function getLatestCommit(repoPath: string): Promise<string> {
  const git: SimpleGit = gitP(repoPath);
  const result = await git.revparse('HEAD');
  return result.trim();
}

/**
 * 获取指定 ref 的 commit SHA
 *
 * @param repoPath - 仓库路径
 * @param ref - 引用（分支名、标签等）
 * @returns commit SHA
 */
export async function getRefCommit(repoPath: string, ref: string): Promise<string> {
  const git: SimpleGit = gitP(repoPath);
  const result = await git.revparse([ref]);
  return result.trim();
}

/**
 * 检出指定 commit
 *
 * @param repoPath - 仓库路径
 * @param commit - commit SHA
 */
export async function checkoutCommit(repoPath: string, commit: string): Promise<void> {
  const git: SimpleGit = gitP(repoPath);
  await git.checkout(commit);
}

/**
 * 获取当前分支名
 *
 * @param repoPath - 仓库路径
 * @returns 当前分支名
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  const git: SimpleGit = gitP(repoPath);
  const result = await git.revparse(['--abbrev-ref', 'HEAD']);
  return result.trim();
}
