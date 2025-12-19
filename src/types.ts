// ==================== 类型定义 ====================
export interface LsTreeOptions {
  /** 工作目录，默认为 process.cwd() */
  cwd?: string;
  /** 过滤模式，支持字符串、通配符、正则 */
  filter?: string[];
  /** 输出文件路径 */
  output?: string;
  /** 合并文件输出路径 */
  outputMerged?: string;
  /** 是否启用交互式合并文件模式 */
  join?: boolean;
  /** 合并目录下文件输出路径 */
  outputDirMerge?: string;
  /** 合并目录 */
  mergeDir?: string[];
  /** 遍历深度，-1表示无限深度 */
  depth?: number;
  /** 是否忽略隐藏文件/目录 */
  ignoreHidden?: boolean;
  /** 忽略文件/目录 */
  ignorePatterns?: string[];
}

export interface FileEntry {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  depth: number;
  children?: FileEntry[];
}

export interface FilterPattern {
  type: 'exact' | 'glob' | 'regex';
  pattern: string;
  regex?: RegExp;
}

export interface GitignorePromptAnswer {
  apply: string;
}

export interface FileSelectionAnswer {
  selectedFiles: string[];
}

export interface ConflictResolutionAnswer {
  action: 'overwrite' | 'rename' | 'cancel';
}