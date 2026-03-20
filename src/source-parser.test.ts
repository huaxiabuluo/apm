import { describe, expect, it } from 'vitest';

import { parseSource } from './source-parser';

describe('parseSource', () => {
  it('uses the default npm registry in sourceUrl when no registry is provided', () => {
    expect(parseSource('npm:test-package')).toMatchObject({
      sourceType: 'npm',
      source: 'test-package',
      sourceUrl: 'https://registry.npmjs.org/test-package',
      registry: undefined,
    });
  });

  it('uses the custom npm registry in sourceUrl when registry is provided', () => {
    expect(parseSource('npm:@ai-dancer/apm?registry=https://registry.npmmirror.com/')).toMatchObject({
      sourceType: 'npm',
      source: '@ai-dancer/apm',
      sourceUrl: 'https://registry.npmmirror.com/@ai-dancer/apm',
      registry: 'https://registry.npmmirror.com/',
    });
  });

  it('parses latest as an npm version specifier', () => {
    expect(parseSource('npm:@ai-dancer/apm@latest')).toMatchObject({
      sourceType: 'npm',
      source: '@ai-dancer/apm',
      sourceUrl: 'https://registry.npmjs.org/@ai-dancer/apm',
      version: 'latest',
    });
  });

  it('parses explicit github tag syntax', () => {
    expect(parseSource('github:anthropic/ai-skills@tag:v1.0.0')).toMatchObject({
      sourceType: 'github',
      source: 'anthropic/ai-skills',
      sourceUrl: 'https://github.com/anthropic/ai-skills.git',
      mode: 'tag',
      branch: 'v1.0.0',
      version: 'v1.0.0',
    });
  });

  it('parses explicit github branch syntax', () => {
    expect(parseSource('github:anthropic/ai-skills@branch:main')).toMatchObject({
      sourceType: 'github',
      source: 'anthropic/ai-skills',
      sourceUrl: 'https://github.com/anthropic/ai-skills.git',
      mode: 'branch',
      branch: 'main',
      version: 'main',
    });
  });

  it('rejects github versions without an explicit prefix', () => {
    expect(() => parseSource('github:anthropic/ai-skills@v1.0.0')).toThrow(/版本需要显式前缀/);
  });
});
