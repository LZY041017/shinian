# 拾念 Shinian

本地 Windows 记忆工作台：以一句引句为记忆入口，收录文字与图片，按标签和日期检索，通过随机抽查与透视镜辅助主动回忆。

## 本地运行

需要 Node.js 22.12 或以上版本。以下为 PowerShell 命令，在本目录执行：

```powershell
npm.cmd ci --no-fund
npm.cmd start
```

## 验证

```powershell
npm.cmd test
npm.cmd run test:ui
node tests/edges.cjs
```

界面测试使用独立临时数据目录，不修改正式记忆库。`SHINIAN_DATA_DIR` 可以指定隔离的数据根目录。

## 打包

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/powershell/build/package.ps1
```

输出位于工作区 `outputs/拾念-win32-x64/`，已有同名输出不覆盖。源代码包单独解压时，输出在其上两级目录下的 `outputs/`。

## 文件结构

- `main.cjs` / `preload.cjs`：窗口、受限 IPC、原生文件选择。
- `core.cjs`：数据验证、备份合并、串行原子写入、损坏恢复。
- `ui/model.js`：检索、日期、随机抽样、间隔和统计。
- `ui/app.js`：首页、记忆库与界面状态。
- `ui/dialogs.js`：编辑、图片、标签与数据设置。
- `ui/reader.js`：文字/图片双层裁切透视镜。
- `ui/practice.js`：抽查、回忆记录与总结。
- `ui/styles.css` / `ui/panels.css`：视觉样式与小窗口适配。
- `tests/`：核心及 Electron 实际交互测试。

正式版数据位置为 `%APPDATA%/拾念/library/`（已通过打包应用读取实际路径确认）。正文按纯文本显示，图片保持原始编码；不执行用户 HTML。透视镜属于回忆辅助效果，不是访问控制。复习间隔为固定 1 / 3 / 7 天，每条最多保留 2000 条复习记录。当前没有 OCR、LaTeX 排版、云同步或账号系统。
