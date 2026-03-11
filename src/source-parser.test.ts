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
});
