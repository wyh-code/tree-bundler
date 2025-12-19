import path from 'path';
import fs from 'fs/promises';
import { logger } from './logger';

export class PathUtils {
  /** 标准化路径分隔符 */
  static normalizePath(p: string): string {
    return p.replace(/\\/g, '/');
  }

  /** 检查是否为隐藏文件/目录 */
  static isHidden(name: string): boolean {
    return /^\./.test(name);
  }

  /** 安全读取目录 */
  static async readDirSafe(dirPath: string): Promise<string[]> {
    try {
      return await fs.readdir(dirPath);
    } catch (error: any) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        logger.warning(` 警告: 无权限访问目录 ${dirPath}`);
        return [];
      }
      throw error;
    }
  }

  /** 安全获取文件状态 */
  static async statSafe(filePath: string): Promise<fs.Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      logger.warning(` 警告: 无法获取文件状态 ${filePath}: ${error.message}`);
      return null;
    }
  }

  /** 获取最近一级目录 */
  static getImmediateParent(dirPath = process.cwd()) {
    const parentPath = path.dirname(dirPath);
    return path.basename(parentPath);
  }

  /**
   * 确保目录存在
   * @param dirPath 目录路径
   */
  static async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`创建目录失败 ${dirPath}: ${(error as Error).message}`);
    }
  }
}
