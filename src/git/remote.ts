/**
 * Git 远程查询工具
 * 使用 simple-git 获取远程仓库信息，无需克隆
 */

import { gitP, type SimpleGit } from 'simple-git';

const LS_REMOTE_TIMEOUT_MS = 30000; // 30 秒超时

/**
 * 验证仓库 URL 是否有效
 *
 * @param repoUrl - 仓库 URL
 * @throws {Error} 如果 URL 无效
 */
function validateRepoUrl(repoUrl: string): void {
  if (!repoUrl || typeof repoUrl !== 'string' || !repoUrl.trim()) {
    throw new Error('Repository URL must be a non-empty string');
  }
}

/**
 * 验证分支名是否有效
 *
 * @param branch - 分支名
 * @throws {Error} 如果分支名无效
 */
function validateBranch(branch: string): void {
  if (!branch || typeof branch !== 'string' || !branch.trim()) {
    throw new Error('Branch name must be a non-empty string');
  }
}

/**
 * 语义化版本正则表达式
 * 支持:
 * - 1.0.0
 * - v1.0.0
 * - 带预发布版本: 1.0.0-beta, 2.0.0-alpha.1
 */
const SEMVER_REGEX = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

/**
 * 检查标签是否是语义化版本
 *
 * @param tag - 标签名称
 * @returns 是否是语义化版本
 */
export function isSemanticVersion(tag: unknown): boolean {
  if (typeof tag !== 'string') {
    return false;
  }
  return SEMVER_REGEX.test(tag);
}

/**
 * 过滤出语义化版本的标签
 *
 * @param tags - 标签数组
 * @returns 语义化版本标签数组
 */
export function filterSemanticVersions(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  return tags.filter(isSemanticVersion);
}

/**
 * 获取远程仓库的所有 tags
 *
 * @param repoUrl - 仓库 URL
 * @returns 标签数组
 */
export async function getRemoteTags(repoUrl: string): Promise<string[]> {
  validateRepoUrl(repoUrl);

  try {
    const git: SimpleGit = gitP({ timeout: { block: LS_REMOTE_TIMEOUT_MS } });
    const result = await git.listRemote(['--tags', repoUrl]);

    // git ls-remote 输出格式：
    // <commit-sha>\trefs/tags/v1.0.0
    // <commit-sha>\trefs/tags/v1.0.0^{} (annotated tag 的重复引用)

    const tags = result
      .split('\n')
      .filter((line) => line.trim()) // 移除空行
      .map((line) => line.split('\t')[1]) // 提取引用部分
      .filter((ref): ref is string => !!ref && ref.startsWith('refs/tags/')) // 只要 tags
      .map((ref) => ref.replace('refs/tags/', '')) // 移除前缀
      .filter((tag) => !tag.endsWith('^{}')); // 过滤掉 annotated tag 的重复引用

    return tags;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get remote tags from ${repoUrl}: ${errorMessage}`);
  }
}

/**
 * 获取远程分支的最新 commit SHA
 *
 * @param repoUrl - 仓库 URL
 * @param branch - 分支名（如: master, main, develop）
 * @returns commit SHA
 */
export async function getRemoteBranchCommit(repoUrl: string, branch: string): Promise<string> {
  validateRepoUrl(repoUrl);
  validateBranch(branch);

  try {
    const git: SimpleGit = gitP({ timeout: { block: LS_REMOTE_TIMEOUT_MS } });
    const result = await git.listRemote([repoUrl, `refs/heads/${branch}`]);

    // git ls-remote 输出格式：
    // <commit-sha>\trefs/heads/master

    const line = result.trim().split('\n')[0];
    if (!line) {
      throw new Error(`Branch '${branch}' not found in remote repository`);
    }

    const commitSha = line.split('\t')[0];
    return commitSha;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get remote branch commit for ${branch} from ${repoUrl}: ${errorMessage}`);
  }
}
