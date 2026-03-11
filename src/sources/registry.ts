import { SourceHandler, SkillInfo } from './types.js';
import { NpmSourceHandler } from './npm.js';

/**
 * 源处理器注册表
 */
class SourceRegistry {
  private handlers: Map<string, SourceHandler> = new Map();

  /**
   * 注册源处理器
   */
  register(handler: SourceHandler): void {
    this.handlers.set(handler.type, handler);
  }

  /**
   * 获取指定类型的处理器
   */
  get(type: string): SourceHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * 获取所有已注册的处理器
   */
  getAll(): SourceHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * 使用所有已注册的处理器尝试解析源
   * @returns 解析成功的技能信息，如果所有处理器都无法解析则返回 null
   */
  parse(source: string): SkillInfo | null {
    for (const handler of this.getAll()) {
      const result = handler.parse(source);
      if (result) {
        return result;
      }
    }
    return null;
  }
}

/**
 * 全局源注册表实例
 */
export const sourceRegistry = new SourceRegistry();

// 注册默认的源处理器
sourceRegistry.register(new NpmSourceHandler());

/**
 * 注册自定义源处理器的便捷函数
 */
export function registerSourceHandler(handler: SourceHandler): void {
  sourceRegistry.register(handler);
}
