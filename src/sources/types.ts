/**
 * 技能信息
 */
export interface SkillInfo {
  /** 技能名称 */
  name: string;
  /** 技能来源（git、npm 等） */
  source: string;
  /** 版本或分支 */
  version?: string;
}

/**
 * 源处理器接口
 * 所有源处理器都需要实现这个接口
 */
export interface SourceHandler {
  /** 源类型标识 */
  type: string;

  /**
   * 解析源字符串
   * @param source 源字符串
   * @returns 解析后的技能信息，如果无法解析则返回 null
   */
  parse(source: string): SkillInfo | null;

  /**
   * 验证源是否有效
   * @param info 技能信息
   * @returns 是否有效
   */
  validate(info: SkillInfo): boolean | Promise<boolean>;
}
