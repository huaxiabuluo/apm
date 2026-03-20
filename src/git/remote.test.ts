import { beforeEach, describe, expect, it, vi } from 'vitest';
import { filterSemanticVersions, getRemoteBranchCommit, getRemoteTags, isSemanticVersion } from './remote';

// Mock simple-git
const { mockListRemote } = vi.hoisted(() => ({
  mockListRemote: vi.fn(),
}));

vi.mock('simple-git', () => ({
  gitP: () => ({
    listRemote: mockListRemote,
  }),
}));

// Setup mock before each test
beforeEach(() => {
  vi.clearAllMocks();
});

describe('isSemanticVersion', () => {
  it('should accept valid semantic versions', () => {
    expect(isSemanticVersion('1.0.0')).toBe(true);
    expect(isSemanticVersion('v1.0.0')).toBe(true);
    expect(isSemanticVersion('2.3.4-beta')).toBe(true);
    expect(isSemanticVersion('10.20.30')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isSemanticVersion('latest')).toBe(false);
    expect(isSemanticVersion('stable')).toBe(false);
    expect(isSemanticVersion('release-2024')).toBe(false);
    expect(isSemanticVersion('v1')).toBe(false);
    expect(isSemanticVersion('1.0')).toBe(false);
  });

  it('should handle non-string input', () => {
    expect(isSemanticVersion(null)).toBe(false);
    expect(isSemanticVersion(undefined)).toBe(false);
    expect(isSemanticVersion(123)).toBe(false);
    expect(isSemanticVersion({})).toBe(false);
    expect(isSemanticVersion([])).toBe(false);
    expect(isSemanticVersion(true)).toBe(false);
  });
});

describe('filterSemanticVersions', () => {
  it('should filter only semantic version tags', () => {
    const tags = ['v1.0.0', 'latest', 'stable', 'v2.0.0', 'release-2024', 'v1.2.3-beta'];
    const semver = filterSemanticVersions(tags);
    expect(semver).toEqual(['v1.0.0', 'v2.0.0', 'v1.2.3-beta']);
  });

  it('should handle empty array', () => {
    expect(filterSemanticVersions([])).toEqual([]);
  });

  it('should handle array with no semantic versions', () => {
    expect(filterSemanticVersions(['latest', 'stable', 'prod'])).toEqual([]);
  });

  it('should handle non-array input', () => {
    expect(filterSemanticVersions(null)).toEqual([]);
    expect(filterSemanticVersions(undefined)).toEqual([]);
    expect(filterSemanticVersions('string')).toEqual([]);
    expect(filterSemanticVersions(123)).toEqual([]);
    expect(filterSemanticVersions({})).toEqual([]);
  });
});

describe('getRemoteTags', () => {
  it('should fetch and parse remote tags', async () => {
    const mockOutput = `
abc123\trefs/tags/v1.0.0
def456\trefs/tags/v1.0.0^{}
ghi789\trefs/tags/v2.0.0
jkl012\trefs/tags/latest
    `;

    mockListRemote.mockResolvedValue(mockOutput);

    const tags = await getRemoteTags('https://github.com/example/repo.git');

    expect(tags).toEqual(['v1.0.0', 'v2.0.0', 'latest']);
    expect(mockListRemote).toHaveBeenCalledWith(['--tags', 'https://github.com/example/repo.git']);
  });

  it('should filter out annotated tag references', async () => {
    const mockOutput = `
abc123\trefs/tags/v1.0.0
def456\trefs/tags/v1.0.0^{}
    `;

    mockListRemote.mockResolvedValue(mockOutput);

    const tags = await getRemoteTags('https://github.com/example/repo.git');

    expect(tags).toEqual(['v1.0.0']);
  });

  it('should throw error for empty repo URL', async () => {
    await expect(getRemoteTags('')).rejects.toThrow('Repository URL must be a non-empty string');
  });

  it('should throw error for invalid repo URL', async () => {
    await expect(getRemoteTags('   ')).rejects.toThrow('Repository URL must be a non-empty string');
  });

  it('should handle empty tag list', async () => {
    mockListRemote.mockResolvedValue('');

    const tags = await getRemoteTags('https://github.com/example/repo.git');

    expect(tags).toEqual([]);
  });

  it('should propagate git errors', async () => {
    mockListRemote.mockRejectedValue(new Error('Network error'));

    await expect(getRemoteTags('https://github.com/example/repo.git')).rejects.toThrow(
      'Failed to get remote tags from https://github.com/example/repo.git: Network error',
    );
  });
});

describe('getRemoteBranchCommit', () => {
  it('should fetch commit SHA for remote branch', async () => {
    const mockOutput = 'abc123def456\trefs/heads/master';

    mockListRemote.mockResolvedValue(mockOutput);

    const commit = await getRemoteBranchCommit('https://github.com/example/repo.git', 'master');

    expect(commit).toBe('abc123def456');
    expect(mockListRemote).toHaveBeenCalledWith(['https://github.com/example/repo.git', 'refs/heads/master']);
  });

  it('should throw error for empty repo URL', async () => {
    await expect(getRemoteBranchCommit('', 'master')).rejects.toThrow('Repository URL must be a non-empty string');
  });

  it('should throw error for empty branch name', async () => {
    await expect(getRemoteBranchCommit('https://github.com/example/repo.git', '')).rejects.toThrow(
      'Branch name must be a non-empty string',
    );
  });

  it('should throw error for invalid branch name', async () => {
    await expect(getRemoteBranchCommit('https://github.com/example/repo.git', '   ')).rejects.toThrow(
      'Branch name must be a non-empty string',
    );
  });

  it('should throw error when branch not found', async () => {
    mockListRemote.mockResolvedValue('');

    await expect(getRemoteBranchCommit('https://github.com/example/repo.git', 'nonexistent')).rejects.toThrow(
      "Branch 'nonexistent' not found in remote repository",
    );
  });

  it('should propagate git errors', async () => {
    mockListRemote.mockRejectedValue(new Error('Network error'));

    await expect(getRemoteBranchCommit('https://github.com/example/repo.git', 'master')).rejects.toThrow(
      'Failed to get remote branch commit for master from https://github.com/example/repo.git: Network error',
    );
  });
});
