import path from 'path';
import ignore from 'ignore';
import { FileEntry } from '../types';
import { PathUtils } from './PathUtils';

export class DirectoryScanner {
  /** 递归扫描目录结构 */
  static async scanDirectory(
    dirPath: string,
    options: {
      depth?: number;
      currentDepth?: number;
      relativePath?: string;
      ignorePatterns?: string[];
      ignoreHidden?: boolean;
    } = {}
  ): Promise<FileEntry[]> {
    const {
      depth = -1,
      currentDepth = 0,
      relativePath = '',
      ignorePatterns = [],
      ignoreHidden = true
    } = options;

    // 深度限制检查
    if (depth >= 0 && currentDepth > depth) {
      return [];
    }

    const entries: FileEntry[] = [];
    const files = await PathUtils.readDirSafe(dirPath);

    // 初始化ignore规则
    const ig = ignorePatterns.length > 0 ? ignore().add(ignorePatterns) : null;

    for (const file of files) {
      // 跳过隐藏文件
      if (ignoreHidden && PathUtils.isHidden(file)) {
        continue;
      }

      const fullPath = path.join(dirPath, file);
      const newRelativePath = relativePath ? `${relativePath}/${file}` : file;
      
      // 检查是否被忽略
      if (ig && ig.ignores(newRelativePath)) {
        continue;
      }

      const stat = await PathUtils.statSafe(fullPath);
      if (!stat) continue;

      const entry: FileEntry = {
        name: file,
        path: fullPath,
        relativePath: newRelativePath,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        depth: currentDepth
      };

      if (entry.isDirectory) {
        const children = await this.scanDirectory(fullPath, {
          depth,
          currentDepth: currentDepth + 1,
          relativePath: newRelativePath,
          ignorePatterns,
          ignoreHidden
        });
        entry.children = children;
      }

      entries.push(entry);
    }

    return entries.sort((a, b) => +b.isDirectory - +a.isDirectory);
  }

  /** 格式化为树形字符串 */
  static formatAsTree(entries: FileEntry[], rootDirName: string): string {
    const lines: string[] = [(rootDirName || path.basename(process.cwd()))];
    function buildTree(items: FileEntry[], prefix = '') {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLast = i === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        
        lines.push(prefix + connector + item.name);
        
        if (item.children && item.children.length > 0) {
          const newPrefix = prefix + (isLast ? '    ' : '│   ');
          buildTree(item.children, newPrefix);
        }
      }
    }
    
    buildTree(entries);
    return lines.join('\n');
  }
}