import fs from 'fs';
import path from 'path';
import { join } from 'path';
import { InteractionSystem } from './utils/InteractionSystem';
import { DirectoryScanner } from './utils/DirectoryScanner';
import { FilterSystem } from './utils/FilterSystem';
import { FileManager } from './utils/FileManager';
import { PathUtils } from './utils/PathUtils';
import { logger } from './utils/logger';
import { LsTreeOptions, FileEntry } from "./types";

export {
  InteractionSystem,
  DirectoryScanner,
  FilterSystem,
  FileManager,
  logger
}

/**
 * 获取 package.json 版本号
 */
function getVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '0.0.0';
  }
}

export function cliEntry() {
  const args = process.argv.slice(2);
  const options: LsTreeOptions = {
    cwd: process.cwd()
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--filter':
      case '-f':
        options.filter = options.filter || [];

        while (args[i + 1] && !/^-/.test(args[i + 1])) {
          if (args[i + 1]?.includes('|')) {
            options.filter = options.filter.concat(args[i + 1].split('|').map(p => p.trim()));
          } else if (args[i + 1]?.trim()) {
            options.filter.push(args[i + 1])
          }
          i++;
        }
        break;

      case '--output':
      case '-o':
        options.output = args[i + 1] || 'ls-tree.txt';
        i++;
        break;

      case '--merge':
      case '-m':
        options.mergeDir = options.mergeDir || [];

        while (args[i + 1] && !/^-/.test(args[i + 1])) {
          if (args[i + 1]?.includes('|')) {
            options.mergeDir = options.mergeDir.concat(
              args[i + 1].split('|').map(p => p.trim())
            );
          } else if (args[i + 1]?.trim()) {
            options.mergeDir.push(args[i + 1].trim());
          }
          i++;
        }

        // 检查是否指定了输出路径
        if (args[i + 1] && /^(-o|--output)$/.test(args[i + 1])) {
          i++; // 跳过 -o/--output
          if (args[i + 1] && !/^-/.test(args[i + 1])) {
            options.outputDirMerge = args[i + 1];
            i++;
          } else {
            options.outputDirMerge = 'ls-tree-merge-dir.txt';
          }
        } else {
          // 未指定输出路径，使用默认值
          options.outputDirMerge = 'ls-tree-merge-dir.txt';
        }

        // 如果指定的输出路径已存在，添加 .tb 后缀
        if (options.outputDirMerge) {
          try {
            fs.accessSync(options.outputDirMerge);
            // 文件存在，添加 .tb 后缀
            options.outputDirMerge = `${options.outputDirMerge}.tb`;
          } catch {
            // 文件不存在，使用原路径
          }
        }
        break;

      case '--join':
      case '-j':
        options.join = true;
        // 检查下一个参数是否为输出路径
        if (args[i + 1] && !args[i + 1].startsWith('-')) {
          options.output = args[i + 1];
          i++;
        }
        break;

      case '--depth':
      case '-d':
        if (args[i + 1]) {
          const depth = parseInt(args[i + 1], 10);
          options.depth = isNaN(depth) ? -1 : depth;
          i++;
        }
        break;

      case '--no-hidden':
        options.ignoreHidden = true;
        break;

      case '--show-hidden':
        options.ignoreHidden = false;
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;

      case '--version':
      case '-v':
        logger.success(`当前版本[current version]：${getVersion()}`);
        process.exit(0);
        break;

      default:
        // 非选项参数视为工作目录
        if (!arg.startsWith('-')) {
          options.cwd = arg;
        }
    }
  }

  return options;
}

/** 打印帮助信息 */
function printHelp(): void {
  logger.success(`📦 ls-tree - 目录树生成与文件合并工具`)
  logger.info(`用法:
  ls-tree [选项] [目录]

选项:
  -f, --filter <模式>    过滤模式，支持字符串/通配符/正则，用|分隔
  -o, --output <路径>    输出文件路径（默认: ls-tree.txt）
  -j, --join [路径]      启用交互式文件合并模式
  -d, --depth <数字>     遍历深度（-1表示无限，默认: -1）
  -m, --merge           合并目录下文件输出单文件
  -v, --version         显示当前版本
  --no-hidden           忽略隐藏文件/目录（默认）
  --show-hidden         显示隐藏文件/目录
  -h, --help            显示帮助信息

示例:
  ls-tree                              # 打印当前目录树
  ls-tree -o tree.txt                  # 保存到文件
  ls-tree -f "node_modules|.git"       # 过滤指定目录
  ls-tree -j                           # 交互式合并文件
  ls-tree -m A                         # 将A目录下的文件合并输出单文件
  ls-tree -d 2                         # 限制深度为2层
  ls-tree /path/to/dir                 # 扫描指定目录
  `);
}

// ==================== 主函数 ====================
export async function main(): Promise<void> {
  try {
    // 初始化参数（filter 和 mergeDir 采用合并策略，其他采用覆盖策略）
    const config = await FileManager.getConfig();
    const entryConfig = cliEntry();
    const options: LsTreeOptions = {
      ...config,
      ...entryConfig,
      // 数组类型配置采用合并策略
      mergeDir: (config.mergeDir || []).concat((entryConfig.mergeDir || [])),
      filter: (config.filter || []).concat((entryConfig.filter || []))
    };
    const cwd = options.cwd || process.cwd();
    const depth = options.depth ?? -1;
    const ignoreHidden = options.ignoreHidden ?? true;

    logger.info(JSON.stringify(options))
    logger.success(`📁 扫描目录: ${cwd}`);
    // 1. 处理.gitignore
    let ignorePatterns = await InteractionSystem.handleGitignore(cwd);
    ignorePatterns = (ignorePatterns?.concat(options.ignorePatterns || []) || []);

    // 2. 扫描目录
    const entries = await DirectoryScanner.scanDirectory(cwd, {
      depth,
      ignorePatterns: ignorePatterns || [],
      ignoreHidden
    });

    if (entries.length === 0) {
      logger.error('📭 目录为空或所有文件均被忽略');
      return;
    }

    // 3. 应用过滤
    let filteredEntries = entries;
    if (options.filter && options.filter.length > 0) {
      const filterPatterns = FilterSystem.parseFilterPatterns(options.filter);
      filteredEntries = FilterSystem.filterEntries(entries, filterPatterns);

      if (filteredEntries.length === 0) {
        logger.error('🎯 过滤后没有符合条件的文件/目录');
        return;
      }
    }

    // 4. 生成目录树
    const rootDirName = path.basename(path.resolve(cwd));
    const treeOutput = DirectoryScanner.formatAsTree(filteredEntries, rootDirName);

    // 5. 确定输出路径
    let treeOutputPath: string | undefined;
    if (options.output) {
      treeOutputPath = await InteractionSystem.resolveOutputConflict(
        'ls-tree.txt',
        options.output
      );
    }

    // 6.确定目录合并输出路径
    let treeDirOutputPath: string | undefined;
    if (options.mergeDir?.length) {
      treeDirOutputPath = await InteractionSystem.resolveOutputConflict(
        '',
        options.outputDirMerge
      );
    }

    // 7. 处理文件合并模式
    if (options.join) {
      const filesToMerge = await InteractionSystem.selectFilesForJoin(filteredEntries);

      if (filesToMerge.length > 0) {
        const mergeOutputPath = await InteractionSystem.resolveOutputConflict(
          'ls-tree-merged.txt',
          options.outputMerged
        );

        logger.info(`🔄 正在合并 ${filesToMerge.length} 个文件...`);
        await PathUtils.ensureDir(PathUtils.getImmediateParent(mergeOutputPath));
        await FileManager.mergeFiles(filesToMerge, mergeOutputPath);
        logger.success(`✅ 合并完成: ${mergeOutputPath}`);
      }
    }

    // 8. 处理文件夹合并模式
    if (options.mergeDir?.length && treeDirOutputPath) {
      logger.info(`🔍 正在收集目录文件...`);

      // 收集所有匹配目录下的文件
      const filesToMerge: string[] = [];

      function collectFilesFromDir(entries: FileEntry[], targetDirs: string[]) {
        for (const entry of entries) {
          // 标准化目标目录（移除前导 ./ 和尾部 /）
          const normalizedTargets = targetDirs.map(dir =>
            dir.replace(/^\.\//, '').replace(/\/+$/, '')
          );

          // 标准化当前条目路径
          const normalizedPath = PathUtils.normalizePath(entry.relativePath);

          // 检查当前条目是否在目标目录中
          const isTargetDir = normalizedTargets.some(target => {
            // 完全匹配目录名
            if (normalizedPath === target) {
              return true;
            }
            // 在目录内（dir/file 或 dir/subdir/file）
            if (normalizedPath.startsWith(target + '/')) {
              return true;
            }
            return false;
          });

          if (isTargetDir) {
            // 如果是文件，添加到列表
            if (!entry.isDirectory) {
              filesToMerge.push(entry.path);
            }
            // 如果是目录，递归收集子文件
            if (entry.children) {
              collectFilesFromDir(entry.children, targetDirs);
            }
          } else if (entry.children) {
            // 继续搜索子目录
            collectFilesFromDir(entry.children, targetDirs);
          }
        }
      }

      collectFilesFromDir(filteredEntries, options.mergeDir);

      if (filesToMerge.length === 0) {
        logger.warning(`⚠️  在目录 ${options.mergeDir.join(', ')} 中未找到文件`);
      } else {
        logger.info(`🔄 正在合并 ${filesToMerge.length} 个文件...`);
        await PathUtils.ensureDir(PathUtils.getImmediateParent(treeDirOutputPath));
        await FileManager.mergeFiles(filesToMerge, treeDirOutputPath);
        logger.success(`✅ 目录合并完成: ${treeDirOutputPath}`);
      }
    }

    // 9. 输出目录树
    if (treeOutputPath) {
      logger.info(`🔄 正在写入目录树...`);
      await PathUtils.ensureDir(PathUtils.getImmediateParent(treeOutputPath));
      await fs.writeFileSync(treeOutputPath, treeOutput, 'utf-8');
      logger.success(`✅ 目录树已保存: ${treeOutputPath}`);
    } else if (!options.join && !options.mergeDir?.length) {
      // 未指定输出且非合并模式（包括 join 和 mergeDir），打印到控制台
      console.log('\n')
      logger.success('成功输出目录如下：\n')
      logger.info(treeOutput, true);
      console.log('\n')
    }

  } catch (error: any) {
    // 用户取消操作不视为错误
    if (error.message === '用户取消操作') {
      logger.info(' 操作已取消');
      return;
    }

    logger.error(`发生错误: ${error.message}`);

    // 提供友好的错误信息
    if (error.code === 'ENOENT') {
      logger.error(`目录不存在: ${error.path || ''}`);
    } else if (error.code === 'EACCES') {
      logger.error(`权限不足，无法访问目录`);
    }

    process.exit(1);
  }
}

main()