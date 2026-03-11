/**
 * 源地址解析器
 * 解析 [type:]source[@version] 格式的源地址
 */

import type { ParsedSource } from './types.js';

/**
 * 验证 GitHub repo 格式
 */
function isValidGithubRepo(input: string): boolean {
  // owner/repo 格式，不能包含 : 或 .git（非 URL 格式）
  const githubRepoPattern = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
  return githubRepoPattern.test(input);
}

/**
 * 构建 GitHub URL
 */
function buildGitHubUrl(ownerRepo: string): string {
  return `https://github.com/${ownerRepo}.git`;
}

/**
 * 提取 owner/repo（从任意 Git URL）
 *
 * 规则：
 * - HTTPS URL (https://host/path.git): 提取路径部分
 * - SSH URL (git@host:path): 提取最后一个 : 后到 .git 前的部分
 * - 其他: 返回原 URL（移除 .git 后缀）
 */
function extractOwnerRepo(url: string): string {
  // HTTPS URL: https://host/group/repo.git -> group/repo
  // 必须先检查 HTTPS，因为 SSH 正则也会匹配 https:// 中的 :
  const httpsMatch = url.match(/https?:\/\/[^/]+\/(.+)\.git$/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  // SSH URL: git@host:group/repo.git -> group/repo
  // 只匹配 git@ 开头的 URL
  if (url.startsWith('git@')) {
    const sshMatch = url.match(/:([^:]+)\.git$/);
    if (sshMatch) {
      const fullPath = sshMatch[1];
      // 提取最后一个 : 后面的部分
      const lastColonIndex = fullPath.lastIndexOf(':');
      if (lastColonIndex !== -1) {
        return fullPath.slice(lastColonIndex + 1);
      }
      return fullPath;
    }
  }

  // 无法提取，返回原 URL（移除 .git 后缀）
  if (url.endsWith('.git')) {
    return url.slice(0, -4);
  }

  return url;
}

/**
 * 确保 URL 以 .git 结尾
 */
function ensureGitExtension(url: string): string {
  if (!url.endsWith('.git')) {
    return `${url}.git`;
  }
  return url;
}

/**
 * 构建 NPM registry URL
 */
function buildNpmUrl(packageName: string, registry?: string): string {
  const baseUrl = (registry || 'https://registry.npmjs.org').replace(/\/$/, '');
  return `${baseUrl}/${packageName}`;
}

/**
 * 严格解析版本类型
 * @param version - 版本字符串，可能为 undefined
 * @returns 解析结果
 * @throws 当版本格式不正确时抛出错误
 */
export function parseVersionWithPrefix(version: string | undefined): {
  type: 'tag' | 'branch';
  name: string | undefined;
  source: 'default' | 'explicit';
} {
  // 第 1 层：无参数 → 默认分支
  if (!version) {
    return {
      type: 'branch',
      name: undefined, // 使用仓库默认分支
      source: 'default',
    };
  }

  // 第 2 层：显式前缀验证
  const match = version.match(/^(tag|branch):(.+)$/);
  if (!match) {
    throw new Error(
      `版本需要显式前缀：
  • Tag:    tag:v1.0.0
  • Branch: branch:feat-hello
  • 默认:   不提供版本参数使用默认分支

当前输入: ${version}`
    );
  }

  const [, type, name] = match;
  return { type: type as 'tag' | 'branch', name, source: 'explicit' };
}

/**
 * 自动检测源类型
 */
function detectSourceType(input: string): 'github' | 'git' | 'npm' | 'local' {
  // file:// 前缀
  if (input.startsWith('file://')) {
    return 'local';
  }

  // 本地路径（以 / 或 ./ 或 ../ 开头）
  if (input.startsWith('/') || input.startsWith('./') || input.startsWith('../')) {
    return 'local';
  }

  // GitHub repo (owner/repo 格式，不包含 .git)
  // 必须在 npm 检测之前，因为 owner/repo 也包含 /
  if (isValidGithubRepo(input)) {
    return 'github';
  }

  // npm 包（以 @ 开头的 scoped 包，或没有 / 的普通包名）
  if (input.startsWith('@')) {
    return 'npm';
  }

  // 如果不包含 /，可能是普通 npm 包名（如 lodash）
  if (!input.includes('/')) {
    return 'npm';
  }

  // 默认为 git
  return 'git';
}

/**
 * 解析查询参数中的 registry
 * @param input - 可能包含 ?registry= 的输入字符串
 * @returns registry URL 或 undefined
 */
function parseRegistryParam(input: string): string | undefined {
  const registryMatch = input.match(/[?&]registry=([^&]+)/);
  if (registryMatch) {
    return decodeURIComponent(registryMatch[1]);
  }
  return undefined;
}

/**
 * 解析源地址字符串
 *
 * 支持的格式：
 * - github:owner/repo[@version]
 * - git:<url>[@version]
 * - npm:<package>[@version][?registry=<url>]
 * - npm:<package>[@version][?registry=<url>]
 * - file://<path>
 *
 * @param input - 用户输入的源地址
 * @returns 解析后的源信息
 */
export function parseSource(input: string): ParsedSource {
  // 1. 提取 registry 参数（如果存在）
  const registry = parseRegistryParam(input);
  // 移除 registry 参数，避免影响后续解析
  const inputWithoutRegistry = input
    .replace(/[?&]registry=[^&]+/, '')
    .replace('?&', '?')
    .replace(/&$/, '');

  // 2. 检测 sourceType 前缀
  const prefixMatch = inputWithoutRegistry.match(/^([a-z]+):/i);
  let sourceType: 'github' | 'git' | 'npm' | 'local';
  let remaining = inputWithoutRegistry;

  if (prefixMatch) {
    const type = prefixMatch[1].toLowerCase();
    if (type === 'github') {
      sourceType = 'github';
      remaining = inputWithoutRegistry.slice(prefixMatch[0].length);
    } else if (type === 'git') {
      sourceType = 'git';
      remaining = inputWithoutRegistry.slice(prefixMatch[0].length);
    } else if (type === 'npm') {
      sourceType = 'npm';
      remaining = inputWithoutRegistry.slice(prefixMatch[0].length);
    } else if (type === 'file') {
      sourceType = 'local';
      remaining = inputWithoutRegistry.slice(prefixMatch[0].length);
    } else if (type === 'http' || type === 'https' || type === 'ftp') {
      // http://, https://, ftp:// 前缀视为 git 类型，保留完整 URL
      sourceType = 'git';
      remaining = inputWithoutRegistry;
    } else {
      throw new Error(`Unknown source type: ${type}`);
    }
  } else {
    // 自动检测
    sourceType = detectSourceType(remaining);
  }

  // 2. 分离 source 和 @version
  // 对于 git 类型，版本分隔符应该出现在 .git 之后
  // 对于 npm scoped 包，需要特别处理开头的 @
  let version: string | undefined;
  let sourcePart = remaining;

  if (sourceType === 'npm' && remaining.startsWith('@')) {
    // scoped npm 包格式：@scope/name[@version]
    // 查找包名后面的 @ 作为版本分隔符（不能是开头的 @）
    // 使用更精确的正则：匹配 @scope/name 后面可选的 @version
    const scopedVersionMatch = remaining.match(/^(@[^/]+\/[^@\s]+)@(.+)$/);
    if (scopedVersionMatch) {
      version = scopedVersionMatch[2];
      sourcePart = scopedVersionMatch[1];
    }
    // 否则整个 remaining 是包名（无版本）
  } else if (sourceType === 'git') {
    // Git URL 格式：查找 .git 后的 @ 作为版本分隔符
    const gitVersionMatch = remaining.match(/\.git@(.+)$/);
    if (gitVersionMatch) {
      // 有版本：.git@version
      version = gitVersionMatch[1];
      sourcePart = remaining.slice(0, -gitVersionMatch[1].length - 1);
    }
    // 否则整个 remaining 是 source（无版本或以 .git 结尾）
  } else {
    // 其他类型，正常匹配 @version
    const versionMatch = remaining.match(/@(.+)$/);
    if (versionMatch) {
      version = versionMatch[1];
      sourcePart = remaining.slice(0, -versionMatch[0].length);
    }
  }

  // 3. 解析 source 部分
  let source: string;
  let sourceUrl: string;
  let mode: 'tag' | 'branch' | undefined;
  let branch: string | undefined;

  switch (sourceType) {
    case 'github':
      if (!isValidGithubRepo(sourcePart)) {
        throw new Error(`Invalid GitHub repo format: ${sourcePart}. Expected: owner/repo`);
      }
      source = sourcePart;
      sourceUrl = buildGitHubUrl(sourcePart);
      if (version) {
        const parsed = parseVersionWithPrefix(version);
        mode = parsed.type;
        branch = parsed.name;
        // 移除显式前缀
        version = parsed.name || undefined;
      }
      break;

    case 'git':
      source = extractOwnerRepo(sourcePart);
      sourceUrl = ensureGitExtension(sourcePart);
      if (version) {
        const parsed = parseVersionWithPrefix(version);
        mode = parsed.type;
        branch = parsed.name;
        // 移除显式前缀
        version = parsed.name || undefined;
      }
      break;

    case 'npm':
      source = sourcePart;
      sourceUrl = buildNpmUrl(sourcePart, registry);
      // version 保留，稍后解析为精确版本
      break;

    case 'local':
      // 移除可能存在的 file:// 前缀，保留干净路径
      source = sourcePart.replace(/^\/\//, '');
      sourceUrl = sourcePart.startsWith('file://') ? sourcePart : `file://${sourcePart}`;
      // local 不需要 version
      version = undefined;
      mode = undefined;
      break;
  }

  return {
    sourceType,
    source,
    sourceUrl,
    mode,
    version,
    branch,
    registry,
  };
}
