import { createReadStream, createWriteStream, readFileSync } from 'fs';
import { access } from 'fs/promises'
import { pipeline } from 'stream/promises';
import { PathUtils } from './PathUtils';

export class FileManager {
  /** 安全合并多个文件 */
  static async mergeFiles(
    filePaths: string[],
    outputPath: string,
    options: {
      separator?: string;
      maxFileSize?: number;
    } = {}
  ): Promise<void> {
    const { separator = '\n\n', maxFileSize = 100 * 1024 * 1024 } = options;

    // 检查总文件大小
    let totalSize = 0;
    for (const filePath of filePaths) {
      const stat = await PathUtils.statSafe(filePath);
      if (stat && stat.isFile()) {
        totalSize += stat.size;
        if (totalSize > maxFileSize) {
          throw new Error(`合并文件总大小超过限制 (${maxFileSize} bytes)`);
        }
      }
    }

    const writeStream = createWriteStream(outputPath, { encoding: 'utf-8' });

    // 增加最大监听器数量，避免警告
    writeStream.setMaxListeners(filePaths.length + 5);

    try {
      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];

        // 添加文件头分隔符
        if (i > 0) {
          writeStream.write(separator);
        }

        writeStream.write(`/* === ${filePath} === */\n`);

        // 使用流式读取避免内存问题
        const readStream = createReadStream(filePath, {
          encoding: 'utf-8',
          highWaterMark: 64 * 1024 // 64KB chunks
        });

        await pipeline(readStream, writeStream, { end: false });

        // 添加换行
        writeStream.write('\n');
      }

      // 等待流关闭完成
      await new Promise<void>((resolve, reject) => {
        writeStream.end((err?: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      // 确保出错时销毁流
      writeStream.destroy();
      throw error;
    }
  }


  static async getConfig(dirPath = process.cwd()) {
    try {
      const configFilePath = `${dirPath}/.tbrc.json`;
      await access(configFilePath);
      return JSON.parse(readFileSync(configFilePath, 'utf-8'));
    } catch (err) {
      return {}
    }
  }
}