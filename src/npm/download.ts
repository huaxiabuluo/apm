/**
 * NPM 包下载操作
 */

import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { x } from 'tar';
import { fetch } from 'undici';

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
 * 构建 npm tarball URL
 *
 * @param packageName - npm 包名（如 @anthropic/skills 或 openskills）
 * @param version - 精确版本号（如 1.2.3）
 * @param registry - registry 地址（默认为 npm 官方）
 * @returns tarball URL
 *
 * URL 格式规则：
 * - scoped 包: @scope/name -> https://registry/.../@scope/name/-/name-version.tgz
 * - 普通包: name -> https://registry/.../name/-/name-version.tgz
 */
function buildTarballUrl(
  packageName: string,
  version: string,
  registry: string = 'https://registry.npmjs.org'
): string {
  // 提取包名（对于 scoped 包，去掉 @scope/ 部分）
  let tarballName: string;
  if (packageName.startsWith('@')) {
    // scoped 包: @scope/name -> name
    tarballName = packageName.split('/')[1];
  } else {
    // 普通包: name -> name
    tarballName = packageName;
  }

  // 移除 registry 末尾的斜杠（如果有）
  const baseUrl = registry.endsWith('/') ? registry.slice(0, -1) : registry;

  return `${baseUrl}/${packageName}/-/${tarballName}-${version}.tgz`;
}

/**
 * 下载 npm 包到临时目录
 *
 * @param packageName - npm 包名（如 @anthropic/skills）
 * @param version - 精确版本号（如 1.2.3）
 * @param registry - registry 地址（可选，用于自定义 registry）
 * @returns 临时目录路径
 */
export async function downloadNpmPackage(packageName: string, version: string, registry?: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'skills-v2-npm-'));
  const tarballPath = join(tempDir, 'package.tgz');

  try {
    // 构建下载 URL
    const tarballUrl = buildTarballUrl(packageName, version, registry);

    // 下载 tarball
    const response = await fetch(tarballUrl);

    if (!response.ok) {
      throw new Error(`Failed to download ${packageName}@${version}: ${response.statusText}`);
    }

    // 保存到临时文件
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(tarballPath, buffer);

    // 解压到临时目录
    await x({
      file: tarballPath,
      cwd: tempDir,
      strip: 1, // 移除 package/ 目录前缀
    });

    // 解压成功后，立即删除 tarball 文件，释放磁盘空间
    await rm(tarballPath).catch((error) => {
      // 记录警告，但不影响流程
      console.warn(`Warning: Failed to delete tarball ${tarballPath}:`, error);
    });

    return tempDir;
  } catch (error) {
    // 清理临时目录
    await cleanup(tempDir);

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download ${packageName}@${version}: ${errorMessage}`);
  }
}
