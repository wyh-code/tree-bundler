import { Ora } from 'ora';

interface LsTreeOptions {
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
interface FileEntry {
    name: string;
    path: string;
    relativePath: string;
    isDirectory: boolean;
    size: number;
    depth: number;
    children?: FileEntry[];
}
interface FilterPattern {
    type: 'exact' | 'glob' | 'regex';
    pattern: string;
    regex?: RegExp;
}

declare class InteractionSystem {
    /** 处理.gitignore交互 */
    static handleGitignore(cwd: string): Promise<string[] | null>;
    /** 交互式选择要合并的文件 */
    static selectFilesForJoin(entries: FileEntry[]): Promise<string[]>;
    /** 处理输出文件冲突 */
    static resolveOutputConflict(defaultPath: string, userPath?: string): Promise<string>;
    /** 格式化文件大小 */
    private static formatFileSize;
}

declare class DirectoryScanner {
    /** 递归扫描目录结构 */
    static scanDirectory(dirPath: string, options?: {
        depth?: number;
        currentDepth?: number;
        relativePath?: string;
        ignorePatterns?: string[];
        ignoreHidden?: boolean;
    }): Promise<FileEntry[]>;
    /** 格式化为树形字符串 */
    static formatAsTree(entries: FileEntry[], rootDirName: string): string;
}

declare class FilterSystem {
    /** 解析过滤模式 */
    static parseFilterPatterns(patterns: string[]): FilterPattern[];
    /** 检查路径是否匹配任意过滤模式 */
    static matchPath(patterns: FilterPattern[], filePath: string): boolean;
    /** 应用过滤到文件列表 */
    static filterEntries(entries: FileEntry[], patterns: FilterPattern[]): FileEntry[];
}

declare class FileManager {
    /** 安全合并多个文件 */
    static mergeFiles(filePaths: string[], outputPath: string, options?: {
        separator?: string;
        maxFileSize?: number;
    }): Promise<void>;
    static getConfig(dirPath?: string): Promise<any>;
}

declare class Logger {
    spinner: Ora | null;
    /**
     * 普通信息（蓝色）
     */
    info(message: string, hiddenIcon?: boolean): void;
    /**
     * 成功信息（绿色）
     */
    success(message: string): void;
    /**
     * 警告信息（黄色）
     */
    warning(message: string): void;
    /**
     * 错误信息（红色）
     */
    error(message: string): void;
    /**
     * 开始loading动画
     */
    startSpinner(message: string): void;
    /**
     * 停止loading动画
     */
    stopSpinner(success: boolean, message: string): void;
    /**
     * 获取 spinner 状态（用于测试）
     */
    getSpinnerStatus(): boolean;
    /**
     * 清理 spinner（用于测试）
     */
    clearSpinner(): void;
}
declare const logger: Logger;

declare function cliEntry(): LsTreeOptions;
declare function main(): Promise<void>;

export { DirectoryScanner, FileManager, FilterSystem, InteractionSystem, cliEntry, logger, main };
