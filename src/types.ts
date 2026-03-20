/**
 * skills 类型定义
 * apm.json 格式版本 1
 */

/**
 * 技能对象
 */
export interface Skill {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 技能目录路径 */
  path: string;
  /** SKILL.md 原始内容 */
  rawContent?: string;
  /** 额外的元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * Agent 配置（在 apm.json 中）
 */
export interface AgentConfigEntry {
  /** Agent 唯一标识 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 技能目录路径（相对于项目根目录） */
  skillsDir: string;
  /** 全局技能目录路径（运行时可选，持久化到 apm.json 时省略） */
  globalSkillsDir?: string;
}

/**
 * apm.json 文件格式
 */
export interface SkillsJson {
  /** 文件格式版本 */
  version: 1;
  /** 额外的 agents 配置（除了 .agents 之外的） */
  additionalAgents?: AgentConfigEntry[];
  /** 技能条目映射 */
  skills: Record<string, SkillEntry>;
}

/**
 * Tag 类型的技能条目
 */
export interface TagSkillEntry {
  source: string;
  sourceType: 'github' | 'git';
  sourceUrl: string;
  mode: 'tag';
  tag: string;
  skillPath: string;
}

/**
 * Branch 类型的技能条目
 */
export interface BranchSkillEntry {
  source: string;
  sourceType: 'github' | 'git';
  sourceUrl: string;
  mode: 'branch';
  branch: string;
  commit: string;
  skillPath: string;
}

/**
 * Git 类型的技能条目（tag 或 branch）
 */
export type GitSkillEntry = TagSkillEntry | BranchSkillEntry;

/**
 * NPM 类型的技能条目
 */
export interface NpmSkillEntry {
  source: string;
  sourceType: 'npm';
  sourceUrl: string;
  version: string;
  skillPath: string;
  /** NPM registry 地址（可选，用于私有 registry） */
  registry?: string;
}

/**
 * Local 类型的技能条目
 */
export interface LocalSkillEntry {
  source: string;
  sourceType: 'local';
  sourceUrl: string;
  skillPath: string;
}

/**
 * 单个技能条目（联合类型）
 */
export type SkillEntry = GitSkillEntry | NpmSkillEntry | LocalSkillEntry;

/**
 * 解析后的源地址
 */
export interface ParsedSource {
  /** 源类型 */
  sourceType: 'github' | 'git' | 'npm' | 'local';

  /**
   * 源标识符
   * - Git: owner/repo
   * - NPM: package-name
   * - Local: 绝对路径
   */
  source: string;

  /** 完整的源 URL */
  sourceUrl: string;

  /** 版本模式（仅支持 tag/branch） */
  mode?: 'tag' | 'branch';

  /**
   * 用户指定的版本（如果有）
   * 可能是版本范围（如 ^1.2.3），需要解析为精确版本
   */
  version?: string;

  /** 分支名称（当 mode 为 'branch' 时使用） */
  branch?: string;

  /** NPM registry 地址（仅当 sourceType 为 'npm' 时使用） */
  registry?: string;
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** Agent 唯一标识 */
  name: string;

  /** 显示名称 */
  displayName: string;

  /** 技能目录路径（相对或绝对） */
  skillsDir: string;

  /** 全局技能目录路径 */
  globalSkillsDir?: string;
}

/**
 * add 命令选项
 */
export interface AddOptions {
  /** 跳过确认提示 */
  yes?: boolean;
  /** 指定要安装的技能名称 */
  skill?: string[];
  /** 列出可用技能但不安装 */
  list?: boolean;
  /** 只安装不写入 apm.json */
  noSave?: boolean;
  /** 全局安装模式 */
  global?: boolean;
}

/**
 * install 命令选项
 */
export interface InstallOptions {
  /** 安装前确认 */
  confirm?: boolean;

  /** 目标 agents */
  agents?: string[];

  /** 只安装指定的技能（可选） */
  skills?: string[];

  /** 全局安装模式 */
  global?: boolean;

  /** 内部模式（不显示 intro/outro） */
  internal?: boolean;

  /** 预下载的源目录（内部复用 add 命令下载结果，调用方负责在并行安装全部完成前保持其有效） */
  prefetchedSourceDir?: string;

  /** 直接提供待安装的技能条目（内部使用，可绕过 apm.json 的 skills 字段） */
  skillEntries?: Record<string, SkillEntry>;
}

/**
 * list 命令选项
 */
export interface ListOptions {
  /** 显示详细信息 */
  verbose?: boolean;
  /** 全局安装模式 */
  global?: boolean;
}

/**
 * remove 命令选项
 */
export interface RemoveOptions {
  /** 跳过确认提示 */
  yes?: boolean;
  /** 全局安装模式 */
  global?: boolean;
}

/**
 * check 命令选项
 */
export interface CheckOptions {
  /** 只检查指定的技能 */
  skills?: string[];
  /** 输出格式：table（默认）或 json */
  format?: 'table' | 'json';
  /** 全局安装模式 */
  global?: boolean;
}

/**
 * update 命令选项
 */
export interface UpdateOptions {
  /** 交互式选择要更新的技能 */
  select?: boolean;
  /** 更新后不自动安装 */
  noInstall?: boolean;
  /** 只更新指定的技能 */
  skills?: string[];
  /** 全局安装模式 */
  global?: boolean;
}

/**
 * init 命令选项
 */
export interface InitOptions {
  /** 指定要启用的 agents（跳过交互式选择） */
  agents?: string[];
  /** 全局安装模式 */
  global?: boolean;
}

/**
 * 版本检查结果
 */
export interface VersionCheckResult {
  /** 技能名称 */
  name: string;
  /** 源类型 */
  sourceType: string;
  /** 当前版本信息 */
  current: {
    /** 版本标识（tag/npm版本/commit） */
    version: string;
    /** 额外信息（branch名等） */
    extra?: string;
  };
  /** 最新版本信息 */
  latest?: {
    version: string;
    extra?: string;
  };
  /** 是否有更新 */
  hasUpdate: boolean;
  /** 是否有警告（如非标准tag格式） */
  warning?: string;
  /** 错误信息 */
  error?: string;
}
