import { SourceHandler, SkillInfo } from './types.js';

/**
 * npm 源处理器
 * 处理 npm 包格式的技能源
 */
export class NpmSourceHandler implements SourceHandler {
  type = 'npm';

  /**
   * 解析 npm 包源
   * 支持格式：
   * - @scope/package
   * - @scope/package@version
   * - package
   * - package@version
   */
  parse(source: string): SkillInfo | null {
    // 匹配 @scope/package 或 package 格式
    const npmPattern = /^(@[\w-]+\/[\w-]+|[\w-]+)(?:@(.+))?$/;
    const match = source.match(npmPattern);

    if (!match) {
      return null;
    }

    const [, packageName, version] = match;

    return {
      name: packageName,
      source: 'npm',
      version,
    };
  }

  /**
   * 验证 npm 包信息
   * 这里只做基本验证，实际的有效性检查在下载时进行
   */
  validate(info: SkillInfo): boolean {
    // npm 包名必须符合规范
    const npmPattern = /^(@[\w-]+\/[\w-]+|[\w-]+)$/;
    return npmPattern.test(info.name);
  }
}
