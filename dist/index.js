// node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var getFilename = () => fileURLToPath(import.meta.url);
var getDirname = () => path.dirname(getFilename());
var __dirname = /* @__PURE__ */ getDirname();

// src/index.ts
import fs3 from "fs";
import path5 from "path";
import { join } from "path";

// src/utils/InteractionSystem.ts
import fs from "fs/promises";
import path2 from "path";
import inquirer from "inquirer";

// src/utils/logger.ts
import ora from "ora";
import chalk from "chalk";
var Logger = class {
  constructor() {
    this.spinner = null;
  }
  /**
   * 普通信息（蓝色）
   */
  info(message, hiddenIcon) {
    console.log(chalk.blue(`${hiddenIcon ? "" : "\u2139 "}${message}`));
  }
  /**
   * 成功信息（绿色）
   */
  success(message) {
    console.log(chalk.green("\u2714", message));
  }
  /**
   * 警告信息（黄色）
   */
  warning(message) {
    console.log(chalk.yellow("\u26A0", message));
  }
  /**
   * 错误信息（红色）
   */
  error(message) {
    console.log(chalk.red("\u2716", message));
  }
  /**
   * 开始loading动画
   */
  startSpinner(message) {
    this.spinner = ora(message).start();
  }
  /**
   * 停止loading动画
   */
  stopSpinner(success, message) {
    if (!this.spinner) {
      return;
    }
    if (success) {
      this.spinner.succeed(message);
    } else {
      this.spinner.fail(message);
    }
    this.spinner = null;
  }
  /**
   * 获取 spinner 状态（用于测试）
   */
  getSpinnerStatus() {
    return this.spinner !== null;
  }
  /**
   * 清理 spinner（用于测试）
   */
  clearSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
};
var logger = new Logger();

// src/utils/InteractionSystem.ts
var InteractionSystem = class {
  /** 处理.gitignore交互 */
  static async handleGitignore(cwd) {
    const gitignorePath = path2.join(cwd, ".gitignore");
    try {
      await fs.access(gitignorePath);
    } catch {
      return null;
    }
    const content = await fs.readFile(gitignorePath, "utf-8");
    const patterns = content.split("\n").map((line) => {
      let _line = line.trim();
      if (!_line) return "";
      return _line.replace(/^[\\/]+|[\\/]+$/g, "");
    }).filter((it) => it).filter((line) => line && !line.startsWith("#"));
    if (patterns.length === 0) {
      return null;
    }
    logger.success("\u{1F4C1} \u68C0\u6D4B\u5230 .gitignore \u6587\u4EF6");
    logger.warning("\u5C06\u5FFD\u7565\u4EE5\u4E0B\u76EE\u5F55:");
    patterns.slice(0, 5).forEach((pattern) => {
      logger.error(`  - ${pattern}`);
    });
    if (patterns.length > 5) {
      logger.warning(`  ... \u8FD8\u6709 ${patterns.length - 5} \u4E2A\u89C4\u5219`);
    }
    const { apply } = await inquirer.prompt({
      type: "input",
      name: "apply",
      message: "\x1B[33m\u5E94\u7528.gitignore\u89C4\u5219\uFF1F[n/y]\x1B[39m",
      default: "n",
      validate: (input) => {
        const normalized = (input || "").trim().toLowerCase();
        return ["", "n", "y"].includes(normalized) ? true : "\u8BF7\u8F93\u5165 y \u6216 n\uFF08\u76F4\u63A5\u56DE\u8F66\u8868\u793A n\uFF09";
      }
    });
    const shouldApply = (apply || "").trim().toLowerCase() === "y";
    return shouldApply ? patterns : null;
  }
  /** 交互式选择要合并的文件 */
  static async selectFilesForJoin(entries) {
    const allFiles = [];
    function collectFiles(items) {
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
      logger.error(" \u5F53\u524D\u76EE\u5F55\u4E0B\u6CA1\u6709\u53EF\u9009\u62E9\u7684\u6587\u4EF6");
      return [];
    }
    const choices = allFiles.map((file) => ({
      name: `${file.relativePath} (${this.formatFileSize(file.size)})`,
      value: file.path,
      short: file.relativePath
    }));
    const { selectedFiles } = await inquirer.prompt({
      type: "checkbox",
      name: "selectedFiles",
      message: "\x1B[33m\u9009\u62E9\u8981\u5408\u5E76\u7684\u6587\u4EF6\x1B[39m \x1B[32m(\u7A7A\u683C\u9009\u62E9/\u53D6\u6D88\uFF0C\u56DE\u8F66\u786E\u8BA4):\x1B[39m\n\n",
      prefix: "",
      choices,
      pageSize: Math.min(20, choices.length),
      validate: (input) => {
        const selected = Array.isArray(input) ? input : [];
        if (selected.length === 0) {
          return "\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u6587\u4EF6";
        }
        return true;
      }
    });
    return selectedFiles;
  }
  /** 处理输出文件冲突 */
  static async resolveOutputConflict(defaultPath, userPath) {
    const outputPath = userPath || defaultPath;
    try {
      await fs.access(outputPath);
      const { action } = await inquirer.prompt({
        type: "list",
        name: "action",
        message: `\u6587\u4EF6 "${path2.basename(outputPath)}" \u5DF2\u5B58\u5728\uFF0C\u5982\u4F55\u5904\u7406\uFF1F`,
        choices: [
          { name: "\u8986\u76D6", value: "overwrite" },
          { name: "\u81EA\u52A8\u91CD\u547D\u540D (\u5982: ls-tree.txt.1)", value: "rename" },
          { name: "\u53D6\u6D88\u64CD\u4F5C", value: "cancel" }
        ],
        default: "rename"
      });
      if (action === "cancel") {
        throw new Error("\u7528\u6237\u53D6\u6D88\u64CD\u4F5C");
      }
      if (action === "overwrite") {
        return outputPath;
      }
      let counter = 1;
      let newPath = outputPath;
      const dir = path2.dirname(outputPath);
      const ext = path2.extname(outputPath);
      const base = path2.basename(outputPath, ext);
      while (true) {
        newPath = path2.join(dir, `${base}.${counter}${ext}`);
        try {
          await fs.access(newPath);
          counter++;
        } catch {
          break;
        }
      }
      logger.info(`\u{1F4C4} \u6587\u4EF6\u5C06\u4FDD\u5B58\u4E3A: ${path2.basename(newPath)}`);
      return newPath;
    } catch (error) {
      if (error.message === "\u7528\u6237\u53D6\u6D88\u64CD\u4F5C") {
        throw error;
      }
      return outputPath;
    }
  }
  /** 格式化文件大小 */
  static formatFileSize(bytes) {
    if (bytes < 0) return "Invalid";
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(k)),
      sizes.length - 1
    );
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
};

// src/utils/DirectoryScanner.ts
import path4 from "path";
import ignore from "ignore";

// src/utils/PathUtils.ts
import path3 from "path";
import fs2 from "fs/promises";
var PathUtils = class {
  /** 标准化路径分隔符 */
  static normalizePath(p) {
    return p.replace(/\\/g, "/");
  }
  /** 检查是否为隐藏文件/目录 */
  static isHidden(name) {
    return /^\./.test(name);
  }
  /** 安全读取目录 */
  static async readDirSafe(dirPath) {
    try {
      return await fs2.readdir(dirPath);
    } catch (error) {
      if (error.code === "EACCES" || error.code === "EPERM") {
        logger.warning(` \u8B66\u544A: \u65E0\u6743\u9650\u8BBF\u95EE\u76EE\u5F55 ${dirPath}`);
        return [];
      }
      throw error;
    }
  }
  /** 安全获取文件状态 */
  static async statSafe(filePath) {
    try {
      return await fs2.stat(filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      logger.warning(` \u8B66\u544A: \u65E0\u6CD5\u83B7\u53D6\u6587\u4EF6\u72B6\u6001 ${filePath}: ${error.message}`);
      return null;
    }
  }
  /** 获取最近一级目录 */
  static getImmediateParent(dirPath = process.cwd()) {
    const parentPath = path3.dirname(dirPath);
    return path3.basename(parentPath);
  }
  /**
   * 确保目录存在
   * @param dirPath 目录路径
   */
  static async ensureDir(dirPath) {
    try {
      await fs2.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`\u521B\u5EFA\u76EE\u5F55\u5931\u8D25 ${dirPath}: ${error.message}`);
    }
  }
};

// src/utils/DirectoryScanner.ts
var DirectoryScanner = class {
  /** 递归扫描目录结构 */
  static async scanDirectory(dirPath, options = {}) {
    const {
      depth = -1,
      currentDepth = 0,
      relativePath = "",
      ignorePatterns = [],
      ignoreHidden = true
    } = options;
    if (depth >= 0 && currentDepth > depth) {
      return [];
    }
    const entries = [];
    const files = await PathUtils.readDirSafe(dirPath);
    const ig = ignorePatterns.length > 0 ? ignore().add(ignorePatterns) : null;
    for (const file of files) {
      if (ignoreHidden && PathUtils.isHidden(file)) {
        continue;
      }
      const fullPath = path4.join(dirPath, file);
      const newRelativePath = relativePath ? `${relativePath}/${file}` : file;
      if (ig && ig.ignores(newRelativePath)) {
        continue;
      }
      const stat = await PathUtils.statSafe(fullPath);
      if (!stat) continue;
      const entry = {
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
  static formatAsTree(entries, rootDirName) {
    const lines = [rootDirName || path4.basename(process.cwd())];
    function buildTree(items, prefix = "") {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLast = i === items.length - 1;
        const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
        lines.push(prefix + connector + item.name);
        if (item.children && item.children.length > 0) {
          const newPrefix = prefix + (isLast ? "    " : "\u2502   ");
          buildTree(item.children, newPrefix);
        }
      }
    }
    buildTree(entries);
    return lines.join("\n");
  }
};

// src/utils/FilterSystem.ts
import minimatch from "minimatch";
var FilterSystem = class {
  /** 解析过滤模式 */
  static parseFilterPatterns(patterns) {
    return patterns.map((pattern) => {
      if (pattern.startsWith("/") && pattern.endsWith("/")) {
        try {
          const regexPattern = pattern.slice(1, -1);
          return {
            type: "regex",
            pattern,
            regex: new RegExp(regexPattern)
          };
        } catch {
          console.warn(`\u26A0\uFE0F  \u65E0\u6548\u7684\u6B63\u5219\u8868\u8FBE\u5F0F: ${pattern}\uFF0C\u5C06\u4F7F\u7528\u7CBE\u786E\u5339\u914D`);
          return { type: "exact", pattern };
        }
      }
      if (pattern.includes("*") || pattern.includes("?")) {
        return { type: "glob", pattern };
      }
      return { type: "exact", pattern };
    });
  }
  /** 检查路径是否匹配任意过滤模式 */
  static matchPath(patterns, filePath) {
    var _a;
    const normalizedPath = PathUtils.normalizePath(filePath);
    const pathSegments = normalizedPath.split("/");
    for (const filter of patterns) {
      const normalizedPattern = filter.pattern.replace(/^\.\//, "");
      switch (filter.type) {
        case "exact":
          if (normalizedPath === normalizedPattern) {
            return true;
          }
          if (pathSegments.includes(normalizedPattern)) {
            return true;
          }
          if (normalizedPath.startsWith(normalizedPattern + "/")) {
            return true;
          }
          break;
        case "glob":
          const globPattern = normalizedPattern;
          if (minimatch(normalizedPath, globPattern)) {
            return true;
          }
          if (pathSegments.some((seg) => minimatch(seg, globPattern))) {
            return true;
          }
          if (normalizedPath.split("/").some((_, i, arr) => {
            const subPath = arr.slice(0, i + 1).join("/");
            return minimatch(subPath, globPattern);
          })) {
            return true;
          }
          break;
        case "regex":
          if ((_a = filter.regex) == null ? void 0 : _a.test(normalizedPath)) {
            return true;
          }
          break;
      }
    }
    return false;
  }
  /** 应用过滤到文件列表 */
  static filterEntries(entries, patterns) {
    return entries.filter((entry) => {
      entry.children = entry.children && this.filterEntries(entry.children, patterns);
      return !this.matchPath(patterns, entry.relativePath);
    });
  }
};

// src/utils/FileManager.ts
import { createReadStream, createWriteStream, readFileSync } from "fs";
import { access } from "fs/promises";
import { pipeline } from "stream/promises";
var FileManager = class {
  /** 安全合并多个文件 */
  static async mergeFiles(filePaths, outputPath, options = {}) {
    const { separator = "\n\n", maxFileSize = 100 * 1024 * 1024 } = options;
    let totalSize = 0;
    for (const filePath of filePaths) {
      const stat = await PathUtils.statSafe(filePath);
      if (stat && stat.isFile()) {
        totalSize += stat.size;
        if (totalSize > maxFileSize) {
          throw new Error(`\u5408\u5E76\u6587\u4EF6\u603B\u5927\u5C0F\u8D85\u8FC7\u9650\u5236 (${maxFileSize} bytes)`);
        }
      }
    }
    const writeStream = createWriteStream(outputPath, { encoding: "utf-8" });
    writeStream.setMaxListeners(filePaths.length + 5);
    try {
      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        if (i > 0) {
          writeStream.write(separator);
        }
        writeStream.write(`/* === ${filePath} === */
`);
        const readStream = createReadStream(filePath, {
          encoding: "utf-8",
          highWaterMark: 64 * 1024
          // 64KB chunks
        });
        await pipeline(readStream, writeStream, { end: false });
        writeStream.write("\n");
      }
      await new Promise((resolve, reject) => {
        writeStream.end((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      writeStream.destroy();
      throw error;
    }
  }
  static async getConfig(dirPath = process.cwd()) {
    try {
      const configFilePath = `${dirPath}/.tbrc.json`;
      await access(configFilePath);
      return JSON.parse(readFileSync(configFilePath, "utf-8"));
    } catch (err) {
      return {};
    }
  }
};

// src/index.ts
function getVersion() {
  try {
    const packageJsonPath = join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs3.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version;
  } catch {
    return "0.0.0";
  }
}
function cliEntry() {
  var _a, _b, _c, _d;
  const args = process.argv.slice(2);
  const options = {
    cwd: process.cwd()
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--filter":
      case "-f":
        options.filter = options.filter || [];
        while (args[i + 1] && !/^-/.test(args[i + 1])) {
          if ((_a = args[i + 1]) == null ? void 0 : _a.includes("|")) {
            options.filter = options.filter.concat(args[i + 1].split("|").map((p) => p.trim()));
          } else if ((_b = args[i + 1]) == null ? void 0 : _b.trim()) {
            options.filter.push(args[i + 1]);
          }
          i++;
        }
        break;
      case "--output":
      case "-o":
        options.output = args[i + 1] || "ls-tree.txt";
        i++;
        break;
      case "--merge":
      case "-m":
        options.mergeDir = options.mergeDir || [];
        while (args[i + 1] && !/^-/.test(args[i + 1])) {
          if ((_c = args[i + 1]) == null ? void 0 : _c.includes("|")) {
            options.mergeDir = options.mergeDir.concat(
              args[i + 1].split("|").map((p) => p.trim())
            );
          } else if ((_d = args[i + 1]) == null ? void 0 : _d.trim()) {
            options.mergeDir.push(args[i + 1].trim());
          }
          i++;
        }
        if (args[i + 1] && /^(-o|--output)$/.test(args[i + 1])) {
          i++;
          if (args[i + 1] && !/^-/.test(args[i + 1])) {
            options.outputDirMerge = args[i + 1];
            i++;
          } else {
            options.outputDirMerge = "ls-tree-merge-dir.txt";
          }
        } else {
          options.outputDirMerge = "ls-tree-merge-dir.txt";
        }
        if (options.outputDirMerge) {
          try {
            fs3.accessSync(options.outputDirMerge);
            options.outputDirMerge = `${options.outputDirMerge}.tb`;
          } catch {
          }
        }
        break;
      case "--join":
      case "-j":
        options.join = true;
        if (args[i + 1] && !args[i + 1].startsWith("-")) {
          options.output = args[i + 1];
          i++;
        }
        break;
      case "--depth":
      case "-d":
        if (args[i + 1]) {
          const depth = parseInt(args[i + 1], 10);
          options.depth = isNaN(depth) ? -1 : depth;
          i++;
        }
        break;
      case "--no-hidden":
        options.ignoreHidden = true;
        break;
      case "--show-hidden":
        options.ignoreHidden = false;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      case "--version":
      case "-v":
        logger.success(`\u5F53\u524D\u7248\u672C[current version]\uFF1A${getVersion()}`);
        process.exit(0);
        break;
      default:
        if (!arg.startsWith("-")) {
          options.cwd = arg;
        }
    }
  }
  return options;
}
function printHelp() {
  logger.success(`\u{1F4E6} ls-tree - \u76EE\u5F55\u6811\u751F\u6210\u4E0E\u6587\u4EF6\u5408\u5E76\u5DE5\u5177`);
  logger.info(`\u7528\u6CD5:
  ls-tree [\u9009\u9879] [\u76EE\u5F55]

\u9009\u9879:
  -f, --filter <\u6A21\u5F0F>    \u8FC7\u6EE4\u6A21\u5F0F\uFF0C\u652F\u6301\u5B57\u7B26\u4E32/\u901A\u914D\u7B26/\u6B63\u5219\uFF0C\u7528|\u5206\u9694
  -o, --output <\u8DEF\u5F84>    \u8F93\u51FA\u6587\u4EF6\u8DEF\u5F84\uFF08\u9ED8\u8BA4: ls-tree.txt\uFF09
  -j, --join [\u8DEF\u5F84]      \u542F\u7528\u4EA4\u4E92\u5F0F\u6587\u4EF6\u5408\u5E76\u6A21\u5F0F
  -d, --depth <\u6570\u5B57>     \u904D\u5386\u6DF1\u5EA6\uFF08-1\u8868\u793A\u65E0\u9650\uFF0C\u9ED8\u8BA4: -1\uFF09
  -m, --merge           \u5408\u5E76\u76EE\u5F55\u4E0B\u6587\u4EF6\u8F93\u51FA\u5355\u6587\u4EF6
  -v, --version         \u663E\u793A\u5F53\u524D\u7248\u672C
  --no-hidden           \u5FFD\u7565\u9690\u85CF\u6587\u4EF6/\u76EE\u5F55\uFF08\u9ED8\u8BA4\uFF09
  --show-hidden         \u663E\u793A\u9690\u85CF\u6587\u4EF6/\u76EE\u5F55
  -h, --help            \u663E\u793A\u5E2E\u52A9\u4FE1\u606F

\u793A\u4F8B:
  ls-tree                              # \u6253\u5370\u5F53\u524D\u76EE\u5F55\u6811
  ls-tree -o tree.txt                  # \u4FDD\u5B58\u5230\u6587\u4EF6
  ls-tree -f "node_modules|.git"       # \u8FC7\u6EE4\u6307\u5B9A\u76EE\u5F55
  ls-tree -j                           # \u4EA4\u4E92\u5F0F\u5408\u5E76\u6587\u4EF6
  ls-tree -m A                         # \u5C06A\u76EE\u5F55\u4E0B\u7684\u6587\u4EF6\u5408\u5E76\u8F93\u51FA\u5355\u6587\u4EF6
  ls-tree -d 2                         # \u9650\u5236\u6DF1\u5EA6\u4E3A2\u5C42
  ls-tree /path/to/dir                 # \u626B\u63CF\u6307\u5B9A\u76EE\u5F55
  `);
}
async function main() {
  var _a, _b, _c;
  try {
    const config = await FileManager.getConfig();
    const entryConfig = cliEntry();
    const options = {
      ...config,
      ...entryConfig,
      // 数组类型配置采用合并策略
      mergeDir: (config.mergeDir || []).concat(entryConfig.mergeDir || []),
      filter: (config.filter || []).concat(entryConfig.filter || [])
    };
    const cwd = options.cwd || process.cwd();
    const depth = options.depth ?? -1;
    const ignoreHidden = options.ignoreHidden ?? true;
    logger.info(JSON.stringify(options));
    logger.success(`\u{1F4C1} \u626B\u63CF\u76EE\u5F55: ${cwd}`);
    let ignorePatterns = await InteractionSystem.handleGitignore(cwd);
    ignorePatterns = (ignorePatterns == null ? void 0 : ignorePatterns.concat(options.ignorePatterns || [])) || [];
    const entries = await DirectoryScanner.scanDirectory(cwd, {
      depth,
      ignorePatterns: ignorePatterns || [],
      ignoreHidden
    });
    if (entries.length === 0) {
      logger.error("\u{1F4ED} \u76EE\u5F55\u4E3A\u7A7A\u6216\u6240\u6709\u6587\u4EF6\u5747\u88AB\u5FFD\u7565");
      return;
    }
    let filteredEntries = entries;
    if (options.filter && options.filter.length > 0) {
      const filterPatterns = FilterSystem.parseFilterPatterns(options.filter);
      filteredEntries = FilterSystem.filterEntries(entries, filterPatterns);
      if (filteredEntries.length === 0) {
        logger.error("\u{1F3AF} \u8FC7\u6EE4\u540E\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u6587\u4EF6/\u76EE\u5F55");
        return;
      }
    }
    const rootDirName = path5.basename(path5.resolve(cwd));
    const treeOutput = DirectoryScanner.formatAsTree(filteredEntries, rootDirName);
    let treeOutputPath;
    if (options.output) {
      treeOutputPath = await InteractionSystem.resolveOutputConflict(
        "ls-tree.txt",
        options.output
      );
    }
    let treeDirOutputPath;
    if ((_a = options.mergeDir) == null ? void 0 : _a.length) {
      treeDirOutputPath = await InteractionSystem.resolveOutputConflict(
        "",
        options.outputDirMerge
      );
    }
    if (options.join) {
      const filesToMerge = await InteractionSystem.selectFilesForJoin(filteredEntries);
      if (filesToMerge.length > 0) {
        const mergeOutputPath = await InteractionSystem.resolveOutputConflict(
          "ls-tree-merged.txt",
          options.outputMerged
        );
        logger.info(`\u{1F504} \u6B63\u5728\u5408\u5E76 ${filesToMerge.length} \u4E2A\u6587\u4EF6...`);
        await PathUtils.ensureDir(PathUtils.getImmediateParent(mergeOutputPath));
        await FileManager.mergeFiles(filesToMerge, mergeOutputPath);
        logger.success(`\u2705 \u5408\u5E76\u5B8C\u6210: ${mergeOutputPath}`);
      }
    }
    if (((_b = options.mergeDir) == null ? void 0 : _b.length) && treeDirOutputPath) {
      let collectFilesFromDir2 = function(entries2, targetDirs) {
        for (const entry of entries2) {
          const normalizedTargets = targetDirs.map(
            (dir) => dir.replace(/^\.\//, "").replace(/\/+$/, "")
          );
          const normalizedPath = PathUtils.normalizePath(entry.relativePath);
          const isTargetDir = normalizedTargets.some((target) => {
            if (normalizedPath === target) {
              return true;
            }
            if (normalizedPath.startsWith(target + "/")) {
              return true;
            }
            return false;
          });
          if (isTargetDir) {
            if (!entry.isDirectory) {
              filesToMerge.push(entry.path);
            }
            if (entry.children) {
              collectFilesFromDir2(entry.children, targetDirs);
            }
          } else if (entry.children) {
            collectFilesFromDir2(entry.children, targetDirs);
          }
        }
      };
      var collectFilesFromDir = collectFilesFromDir2;
      logger.info(`\u{1F50D} \u6B63\u5728\u6536\u96C6\u76EE\u5F55\u6587\u4EF6...`);
      const filesToMerge = [];
      collectFilesFromDir2(filteredEntries, options.mergeDir);
      if (filesToMerge.length === 0) {
        logger.warning(`\u26A0\uFE0F  \u5728\u76EE\u5F55 ${options.mergeDir.join(", ")} \u4E2D\u672A\u627E\u5230\u6587\u4EF6`);
      } else {
        logger.info(`\u{1F504} \u6B63\u5728\u5408\u5E76 ${filesToMerge.length} \u4E2A\u6587\u4EF6...`);
        await PathUtils.ensureDir(PathUtils.getImmediateParent(treeDirOutputPath));
        await FileManager.mergeFiles(filesToMerge, treeDirOutputPath);
        logger.success(`\u2705 \u76EE\u5F55\u5408\u5E76\u5B8C\u6210: ${treeDirOutputPath}`);
      }
    }
    if (treeOutputPath) {
      logger.info(`\u{1F504} \u6B63\u5728\u5199\u5165\u76EE\u5F55\u6811...`);
      await PathUtils.ensureDir(PathUtils.getImmediateParent(treeOutputPath));
      await fs3.writeFileSync(treeOutputPath, treeOutput, "utf-8");
      logger.success(`\u2705 \u76EE\u5F55\u6811\u5DF2\u4FDD\u5B58: ${treeOutputPath}`);
    } else if (!options.join && !((_c = options.mergeDir) == null ? void 0 : _c.length)) {
      console.log("\n");
      logger.success("\u6210\u529F\u8F93\u51FA\u76EE\u5F55\u5982\u4E0B\uFF1A\n");
      logger.info(treeOutput, true);
      console.log("\n");
    }
  } catch (error) {
    if (error.message === "\u7528\u6237\u53D6\u6D88\u64CD\u4F5C") {
      logger.info(" \u64CD\u4F5C\u5DF2\u53D6\u6D88");
      return;
    }
    logger.error(`\u53D1\u751F\u9519\u8BEF: ${error.message}`);
    if (error.code === "ENOENT") {
      logger.error(`\u76EE\u5F55\u4E0D\u5B58\u5728: ${error.path || ""}`);
    } else if (error.code === "EACCES") {
      logger.error(`\u6743\u9650\u4E0D\u8DB3\uFF0C\u65E0\u6CD5\u8BBF\u95EE\u76EE\u5F55`);
    }
    process.exit(1);
  }
}
main();
export {
  DirectoryScanner,
  FileManager,
  FilterSystem,
  InteractionSystem,
  cliEntry,
  logger,
  main
};
//# sourceMappingURL=index.js.map