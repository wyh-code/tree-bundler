import minimatch from 'minimatch';
import { PathUtils } from './PathUtils';
import { FileEntry, FilterPattern } from '../types';


export class FilterSystem {
  /** 解析过滤模式 */
  static parseFilterPatterns(patterns: string[]): FilterPattern[] {
    return patterns.map(pattern => {
      // 检测正则表达式（以/开头和结尾）
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        try {
          const regexPattern = pattern.slice(1, -1);
          return {
            type: 'regex',
            pattern,
            regex: new RegExp(regexPattern)
          };
        } catch {
          // 如果正则无效，退化为字符串匹配
          console.warn(`⚠️  无效的正则表达式: ${pattern}，将使用精确匹配`);
          return { type: 'exact', pattern };
        }
      }

      // 检测通配符（包含*或?）
      if (pattern.includes('*') || pattern.includes('?')) {
        return { type: 'glob', pattern };
      }

      // 字符串完全匹配
      return { type: 'exact', pattern };
    });
  }

  /** 检查路径是否匹配任意过滤模式 */
  static matchPath(patterns: FilterPattern[], filePath: string): boolean {
    const normalizedPath = PathUtils.normalizePath(filePath);
    const pathSegments = normalizedPath.split('/');

    for (const filter of patterns) {
      // 标准化过滤模式（移除前导 ./）
      const normalizedPattern = filter.pattern.replace(/^\.\//, '');

      switch (filter.type) {
        case 'exact':
          // 检查完整路径匹配
          if (normalizedPath === normalizedPattern) {
            return true;
          }
          // 检查是否匹配路径段
          if (pathSegments.includes(normalizedPattern)) {
            return true;
          }
          // 检查是否为目录前缀匹配（dir 应匹配 dir/file.ts）
          if (normalizedPath.startsWith(normalizedPattern + '/')) {
            return true;
          }
          break;

        case 'glob':
          // 标准化 glob 模式
          const globPattern = normalizedPattern;
          if (minimatch(normalizedPath, globPattern)) {
            return true;
          }
          // 检查路径段匹配
          if (pathSegments.some(seg => minimatch(seg, globPattern))) {
            return true;
          }
          // 检查目录前缀匹配
          if (normalizedPath.split('/').some((_, i, arr) => {
            const subPath = arr.slice(0, i + 1).join('/');
            return minimatch(subPath, globPattern);
          })) {
            return true;
          }
          break;

        case 'regex':
          if (filter.regex?.test(normalizedPath)) {
            return true;
          }
          break;
      }
    }
    return false;
  }

  /** 应用过滤到文件列表 */
  static filterEntries(entries: FileEntry[], patterns: FilterPattern[]): FileEntry[] {
    return entries.filter(entry => {
      entry.children = entry.children && this.filterEntries(entry.children, patterns)
      return !this.matchPath(patterns, entry.relativePath)
    });
  }
}