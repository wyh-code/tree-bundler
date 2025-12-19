# tree-bundler

> 📦 可视化目录树并打包文件的 CLI 工具与 Node.js 模块，专为 AI 上下文分享设计 
【CLI tool and Node.js module to visualize directory trees and bundle files for AI context sharing】


一个功能强大的工具，可作为命令行工具或 Node.js 模块使用，帮助你导出代码库结构和内容到单个文件。
【A powerful tool that works as both CLI and Node.js module to export your codebase structure and content into a single file.】

## 适用场景 【Perfect for】

- 🤖 **AI 上下文分享** - 将整个代码库提供给 ChatGPT/Claude/Copilot 【Feed entire codebase to AI assistants】
- 👀 **代码审查** - 与团队分享项目结构 【Share project structure with team】
- 📚 **文档生成** - 生成代码库快照 【Generate codebase snapshots】
- 💾 **代码归档** - 创建可读的代码存档 【Create readable code archives】
- 🔧 **编程集成** - 作为 Node.js 模块集成到你的工具中 【Integrate into your Node.js tools】

## 系统要求 【Requirements】

- Node.js >= 20.0.0

## 安装 【Installation】

```bash
npm install -g tree-bundler
```

## 快速开始 【Quick Start】

```bash
# 显示目录树 【Display directory tree】
tree-bundler # or tb or tbd

# 保存到文件 【Save to file】
tree-bundler -o tree.txt

# 交互式合并文件 【Interactive file merge】
tree-bundler -j

# 合并目录文件 【Merge directory files】
tree-bundler -m src
```

## 选项 【Options】

```
-f, --filter <模式>    过滤模式，支持字符串/通配符/正则，用|分隔
                       【Filter pattern, supports string/glob/regex, separated by |】

-o, --output <路径>    输出文件路径（默认: ls-tree.txt）
                       【Output file path (default: ls-tree.txt)】

-j, --join [路径]      启用交互式文件合并模式
                       【Enable interactive file merge mode】

-d, --depth <数字>     遍历深度（-1表示无限，默认: -1）
                       【Traversal depth (-1 for unlimited, default: -1)】

-m, --merge           合并目录下文件输出单文件
                       【Merge directory files into single output】

--no-hidden           忽略隐藏文件/目录（默认）
                       【Ignore hidden files/directories (default)】

--show-hidden         显示隐藏文件/目录
                       【Show hidden files/directories】

-v, --version         显示当前版本
                       【Show version】

-h, --help            显示帮助信息
                       【Show help】
```

## 使用示例 【Usage Examples】

```bash
# 打印当前目录树 【Print current directory tree】
tree-bundler # or tb or tbd

# 保存到文件 【Save to file】
tree-bundler -o tree.txt

# 过滤指定目录 【Filter specific directories】
tree-bundler -f "node_modules|.git"

# 交互式合并文件 【Interactive file merge】
tree-bundler -j

# 合并指定目录 【Merge specific directory】
tree-bundler -m src

# 限制深度 【Limit depth】
tree-bundler -d 2

# 扫描指定目录 【Scan specific directory】
tree-bundler /path/to/dir

# 组合使用 【Combined usage】
tree-bundler -f "*.test.ts" -d 3 -o output.txt
```

## 配置文件 【Configuration File】

支持在项目根目录创建 `.tbrc.json` 配置文件  
【Supports creating `.tbrc.json` configuration file in project root】

### 配置示例 【Configuration Example】

```json
{
  "filter": ["pattern1", "pattern2"],     // 过滤模式 【Filter patterns】
  "depth": -1,                            // 遍历深度 【Traversal depth】
  "ignoreHidden": true,                   // 忽略隐藏文件 【Ignore hidden files】
  "ignorePatterns": ["*.log"],            // 忽略规则 【Ignore patterns】
  "output": "output.txt",                 // 默认输出路径 【Default output path】
  "outputMerged": "merged.txt",           // 合并文件输出路径 【Merge output path】
  "outputDirMerge": "dir-merge.txt",      // 目录合并输出路径 【Directory merge output path】
  "mergeDir": ["src", "lib"],             // 要合并的目录（与命令行参数合并）【Directories to merge (merged with CLI args)】
}
```

**优先级与合并规则 【Priority & Merge Rules】**
- 数组类型配置（filter、mergeDir）：配置文件 + 命令行参数（合并）【Array configs (filter, mergeDir): Config file + CLI args (merged)】

- 其他配置：命令行参数 > 配置文件 > 默认值【Other configs: CLI args > Config file > Defaults】


## API 使用 【API Usage】

本包也可以作为 Node.js 模块使用【This package can also be used as a Node.js module】

### 安装 【Installation】

```bash
npm install tree-bundler
```

### 导入 【Import】

```typescript
import {
  DirectoryScanner,
  FilterSystem,
  FileManager,
  InteractionSystem,
  logger
} from 'tree-bundler';
```

### API 示例 【API Examples】

#### 1. 扫描目录 【Scan Directory】

```typescript
import { DirectoryScanner } from 'tree-bundler';

const entries = await DirectoryScanner.scanDirectory('./src', {
  depth: 3,
  ignorePatterns: ['node_modules', '.git'],
  ignoreHidden: true
});

const treeOutput = DirectoryScanner.formatAsTree(entries, 'src');
console.log(treeOutput);
```

#### 2. 过滤文件 【Filter Files】

```typescript
import { FilterSystem } from 'tree-bundler';

const patterns = FilterSystem.parseFilterPatterns([
  'node_modules',
  '*.log',
  '/test.*/'
]);

const filtered = FilterSystem.filterEntries(entries, patterns);
```

#### 3. 合并文件 【Merge Files】

```typescript
import { FileManager } from 'tree-bundler';

await FileManager.mergeFiles(
  ['src/index.ts', 'src/utils.ts'],
  'output.txt',
  { separator: '\n\n' }
);
```

#### 4. 交互式选择 【Interactive Selection】

```typescript
import { InteractionSystem } from 'tree-bundler';

// 处理 .gitignore
const ignorePatterns = await InteractionSystem.handleGitignore(process.cwd());

// 选择文件
const selectedFiles = await InteractionSystem.selectFilesForJoin(entries);

// 处理输出冲突
const outputPath = await InteractionSystem.resolveOutputConflict(
  'default.txt',
  'output.txt'
);
```

#### 5. 日志输出 【Logging】

```typescript
import { logger } from 'tree-bundler';

logger.info('普通信息');
logger.success('成功信息');
logger.warning('警告信息');
logger.error('错误信息');
logger.startSpinner('处理中...');
logger.stopSpinner(true, '完成');
```

### TypeScript 类型 【TypeScript Types】

```typescript
import type { 
  LsTreeOptions, 
  FileEntry, 
  FilterPattern 
} from 'tree-bundler';
```

## License

MIT