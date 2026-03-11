/**
 * NPM 版本解析
 * 将版本范围解析为精确版本号
 */

import { fetch } from 'undici';

interface NpmPackageInfo {
  'dist-tags': {
    latest: string;
    [tag: string]: string;
  };
  versions: Record<string, unknown>;
}

/**
 * 解析版本号
 * 格式：major.minor.patch-prerelease
 */
export function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
} | null {
  // 移除 'v' 前缀
  const cleanVersion = version.replace(/^v/i, '');

  const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);

  if (!match) {
    return null;
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
  };
}

/**
 * 比较两个版本号
 *
 * @returns a > b 返回 >0，a == b 返回 0，a < b 返回 <0
 */
export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);

  if (!parsedA || !parsedB) {
    return 0;
  }

  if (parsedA.major !== parsedB.major) {
    return parsedA.major - parsedB.major;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor - parsedB.minor;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch - parsedB.patch;
  }

  // 比较预发布标识符
  if (parsedA.prerelease !== parsedB.prerelease) {
    if (!parsedA.prerelease) return 1;
    if (!parsedB.prerelease) return -1;
    return parsedA.prerelease.localeCompare(parsedB.prerelease);
  }

  return 0;
}

/**
 * 解析版本范围
 * 使用简单的语义化版本匹配
 *
 * @param versionRange - 版本范围（如 ^1.2.3）
 * @param availableVersions - 可用的版本列表
 * @returns 匹配的最新版本
 */
export function resolveVersionRange(versionRange: string, availableVersions: string[]): string | null {
  // 排序版本（降序）
  const sortedVersions = availableVersions.sort((a, b) => {
    return compareVersions(b, a);
  });

  // 解析版本范围前缀
  let minVersion: string | null = null;
  let maxVersion: string | null = null;

  if (versionRange.startsWith('^')) {
    // ^1.2.3 → >=1.2.3 <2.0.0
    minVersion = versionRange.slice(1);
    const parsed = parseVersion(minVersion);
    if (parsed) {
      maxVersion = `${parsed.major + 1}.0.0`;
    }
  } else if (versionRange.startsWith('~')) {
    // ~1.2.3 → >=1.2.3 <1.3.0
    minVersion = versionRange.slice(1);
    const parsed = parseVersion(minVersion);
    if (parsed) {
      maxVersion = `${parsed.major}.${parsed.minor + 1}.0`;
    }
  } else if (versionRange.startsWith('>=')) {
    // >=1.2.3
    minVersion = versionRange.slice(2);
  } else if (versionRange.startsWith('>')) {
    // >1.2.3
    minVersion = versionRange.slice(1);
  } else if (versionRange.startsWith('<=')) {
    // <=1.2.3
    maxVersion = versionRange.slice(2);
  } else if (versionRange.startsWith('<')) {
    // <1.2.3
    maxVersion = versionRange.slice(1);
  } else {
    // 其他情况，尝试精确匹配
    const exactMatch = sortedVersions.find((v) => v === versionRange);
    return exactMatch || null;
  }

  // 找到满足条件的最新版本
  for (const version of sortedVersions) {
    if (minVersion && compareVersions(version, minVersion) < 0) {
      continue;
    }
    if (maxVersion && compareVersions(version, maxVersion) >= 0) {
      continue;
    }
    return version;
  }

  return null;
}

/**
 * 解析 npm 版本范围到精确版本
 *
 * @param packageName - npm 包名（如 @anthropic/skills）
 * @param versionRange - 版本范围（如 ^1.2.3、latest、或空字符串）
 * @param registry - registry 地址（可选，用于自定义 registry）
 * @returns 精确版本号（如 1.2.7）
 */
export async function resolveNpmVersion(
  packageName: string,
  versionRange: string = '',
  registry?: string
): Promise<string> {
  // 使用提供的 registry 或默认 npm registry
  const baseUrl = registry || 'https://registry.npmjs.org';
  // 确保 registry 和 packageName 之间只有一个斜杠
  const registryUrl = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/${packageName}`;

  try {
    const response = await fetch(registryUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch package info: ${response.statusText}`);
    }

    const packageInfo: NpmPackageInfo = (await response.json()) as NpmPackageInfo;

    // 空版本或 'latest' → 使用 latest tag
    if (!versionRange || versionRange === 'latest') {
      return packageInfo['dist-tags'].latest;
    }

    // 精确版本号（如 1.2.3）→ 直接返回
    if (/^\d+\.\d+\.\d+/.test(versionRange)) {
      // 验证版本是否存在
      if (versionRange in packageInfo.versions) {
        return versionRange;
      }
      throw new Error(`Version ${versionRange} not found for ${packageName}`);
    }

    // 版本范围（如 ^1.2.3、~1.2.3）→ 解析为精确版本
    const resolvedVersion = resolveVersionRange(versionRange, Object.keys(packageInfo.versions));

    if (!resolvedVersion) {
      throw new Error(`No matching version found for range ${versionRange}`);
    }

    return resolvedVersion;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve version for ${packageName}: ${errorMessage}`);
  }
}
