import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';
import { GitignorePromptAnswer, FileEntry, FileSelectionAnswer, ConflictResolutionAnswer } from '../types';
import { logger } from './logger';

export class InteractionSystem {
  /** 处理.gitignore交互 */
  static async handleGitignore(cwd: string): Promise<string[] | null> {
    const gitignorePath = path.join(cwd, '.gitignore');

    try {
      await fs.access(gitignorePath);
    } catch {
      return null; // 没有.gitignore文件
    }

    // 读取.gitignore内容
    const content = await fs.readFile(gitignorePath, 'utf-8');
    const patterns: string[] = content.split('\n').map(line => {
      let _line = line.trim();
      if (!_line) return '';
      return _line.replace(/^[\\/]+|[\\/]+$/g, '');
    }).filter(it => it).filter(line => line && !line.startsWith('#'));

    if (patterns.length === 0) {
      return null;
    }

    // 预览受影响的文件/目录
    logger.success('📁 检测到 .gitignore 文件');
    logger.warning('将忽略以下目录:');
    patterns.slice(0, 5).forEach(pattern => {
      logger.error(`  - ${pattern}`);
    });
    if (patterns.length > 5) {
      logger.warning(`  ... 还有 ${patterns.length - 5} 个规则`);
    }

    const { apply } = await inquirer.prompt<GitignorePromptAnswer>({
      type: 'input',
      name: 'apply',
      message: '\u001B[33m应用.gitignore规则？[n/y]\u001B[39m',
      default: 'n',
      validate: (input: string) => {
        const normalized = (input || '').trim().toLowerCase();
        return ['', 'n', 'y'].includes(normalized)
          ? true
          : '请输入 y 或 n（直接回车表示 n）';
      }
    });

    const shouldApply = (apply || '').trim().toLowerCase() === 'y';
    return shouldApply ? patterns : null;
  }

  /** 交互式选择要合并的文件 */
  static async selectFilesForJoin(entries: FileEntry[]): Promise<string[]> {
    // 收集所有文件（非目录）
    const allFiles: FileEntry[] = [];

    function collectFiles(items: FileEntry[]) {
      for (const item of items) {
        if (item.isDirectory && item.children) {
          collectFiles(item.children);
        } else if (!item.isDirectory) {
          allFiles.push(item);
        }
      }
    }

    collectFiles(entries);

    if (allFiles.length === 0) {
      logger.error(' 当前目录下没有可选择的文件');
      return [];
    }

    const choices = allFiles.map(file => ({
      name: `${file.relativePath} (${this.formatFileSize(file.size)})`,
      value: file.path,
      short: file.relativePath
    }));

    const { selectedFiles } = await inquirer.prompt<FileSelectionAnswer>({
      type: 'checkbox',
      name: 'selectedFiles',
      message: '\u001B[33m选择要合并的文件\u001B[39m \u001b[32m(空格选择/取消，回车确认):\u001b[39m\n\n',
      prefix: '',
      choices,
      pageSize: Math.min(20, choices.length),
      validate: (input: string[]) => {
        // 确保 input 是数组
        const selected = Array.isArray(input) ? input : [];
        if (selected.length === 0) {
          return '至少选择一个文件';
        }
        return true;
      }
    });
    return selectedFiles;
  }

  /** 处理输出文件冲突 */
  static async resolveOutputConflict(
    defaultPath: string,
    userPath?: string
  ): Promise<string> {
    const outputPath = userPath || defaultPath;

    try {
      await fs.access(outputPath);

      // 文件已存在，询问用户
      const { action } = await inquirer.prompt<ConflictResolutionAnswer>({
        type: 'list',
        name: 'action',
        message: `文件 "${path.basename(outputPath)}" 已存在，如何处理？`,
        choices: [
          { name: '覆盖', value: 'overwrite' },
          { name: '自动重命名 (如: ls-tree.txt.1)', value: 'rename' },
          { name: '取消操作', value: 'cancel' }
        ],
        default: 'rename'
      });

      if (action === 'cancel') {
        throw new Error('用户取消操作');
      }

      if (action === 'overwrite') {
        return outputPath;
      }

      // 自动重命名
      let counter = 1;
      let newPath = outputPath;
      const dir = path.dirname(outputPath);
      const ext = path.extname(outputPath);
      const base = path.basename(outputPath, ext);

      while (true) {
        newPath = path.join(dir, `${base}.${counter}${ext}`);
        try {
          await fs.access(newPath);
          counter++;
        } catch {
          break; // 找到可用的文件名
        }
      }

      logger.info(`📄 文件将保存为: ${path.basename(newPath)}`);
      return newPath;
    } catch (error: any) {
      // 文件不存在或其他错误
      if (error.message === '用户取消操作') {
        throw error;
      }
      return outputPath;
    }
  }

  /** 格式化文件大小 */
  private static formatFileSize(bytes: number): string {
    if (bytes < 0) return 'Invalid';
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(k)),
      sizes.length - 1
    );

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}
