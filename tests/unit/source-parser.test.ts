import { describe, expect, it } from 'vitest';
import { parseSource, parseVersionWithPrefix } from '../../src/source-parser';

describe('parseVersionWithPrefix - 极简模式', () => {
  it('应该正确处理无参数情况（默认分支）', () => {
    const result = parseVersionWithPrefix(undefined);
    expect(result).toEqual({
      type: 'branch',
      name: undefined,
      source: 'default',
    });
  });
});

describe('parseVersionWithPrefix - 显式 Tag 模式', () => {
  it('应该正确解析 tag:v1.0.0', () => {
    const result = parseVersionWithPrefix('tag:v1.0.0');
    expect(result).toEqual({
      type: 'tag',
      name: 'v1.0.0',
      source: 'explicit',
    });
  });

  it('应该正确解析 tag:1.0.0', () => {
    const result = parseVersionWithPrefix('tag:1.0.0');
    expect(result).toEqual({
      type: 'tag',
      name: '1.0.0',
      source: 'explicit',
    });
  });

  it('应该正确解析 tag:release-2024', () => {
    const result = parseVersionWithPrefix('tag:release-2024');
    expect(result).toEqual({
      type: 'tag',
      name: 'release-2024',
      source: 'explicit',
    });
  });
});

describe('parseVersionWithPrefix - 显式 Branch 模式', () => {
  it('应该正确解析 branch:main', () => {
    const result = parseVersionWithPrefix('branch:main');
    expect(result).toEqual({
      type: 'branch',
      name: 'main',
      source: 'explicit',
    });
  });

  it('应该正确解析 branch:feat-hello', () => {
    const result = parseVersionWithPrefix('branch:feat-hello');
    expect(result).toEqual({
      type: 'branch',
      name: 'feat-hello',
      source: 'explicit',
    });
  });

  it('应该正确解析 branch:feature/add-new-function', () => {
    const result = parseVersionWithPrefix('branch:feature/add-new-function');
    expect(result).toEqual({
      type: 'branch',
      name: 'feature/add-new-function',
      source: 'explicit',
    });
  });
});

describe('parseVersionWithPrefix - 错误处理', () => {
  it('应该在缺少前缀时抛出错误', () => {
    expect(() => parseVersionWithPrefix('v1.0.0')).toThrowError(/版本需要显式前缀/);
  });

  it('应该在无效前缀时抛出错误', () => {
    expect(() => parseVersionWithPrefix('release:v1.0.0')).toThrowError(/版本需要显式前缀/);
  });

  it('错误信息应包含正确的格式提示', () => {
    expect(() => parseVersionWithPrefix('v1.0.0')).toThrowError(/tag:v1\.0\.0/);
    expect(() => parseVersionWithPrefix('v1.0.0')).toThrowError(/branch:feat-hello/);
    expect(() => parseVersionWithPrefix('v1.0.0')).toThrowError(/当前输入: v1\.0\.0/);
  });
});

describe('parseSource - Registry 参数支持', () => {
  it('应该正确解析包含 registry 参数的 npm 包', () => {
    const result = parseSource('npm:@company/skills?registry=https://registry.example.com');

    expect(result.sourceType).toBe('npm');
    expect(result.source).toBe('@company/skills');
    expect(result.registry).toBe('https://registry.example.com');
  });

  it('应该正确解析包含 registry 参数和版本的 npm 包', () => {
    const result = parseSource('npm:@company/skills@1.2.3?registry=https://registry.example.com');

    expect(result.sourceType).toBe('npm');
    expect(result.source).toBe('@company/skills');
    expect(result.version).toBe('1.2.3');
    expect(result.registry).toBe('https://registry.example.com');
  });

  it('应该正确解析使用 & 连接的 registry 参数', () => {
    const result = parseSource('npm:@company/skills&registry=https://registry.example.com');

    expect(result.sourceType).toBe('npm');
    expect(result.source).toBe('@company/skills');
    expect(result.registry).toBe('https://registry.example.com');
  });

  it('应该正确解码 URL 编码的 registry 参数', () => {
    const result = parseSource('npm:@company/skills?registry=https%3A%2F%2Fregistry.example.com');

    expect(result.sourceType).toBe('npm');
    expect(result.source).toBe('@company/skills');
    expect(result.registry).toBe('https://registry.example.com');
  });

  it('没有 registry 参数时应该返回 undefined', () => {
    const result = parseSource('npm:@company/skills');

    expect(result.sourceType).toBe('npm');
    expect(result.source).toBe('@company/skills');
    expect(result.registry).toBeUndefined();
  });
});
