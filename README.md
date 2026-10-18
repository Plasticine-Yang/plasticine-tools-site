# Plasticine Tools

一个支持各种小工具快速使用的工具网站。

## 开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
pnpm preview
```

## 已有工具

### JSON 编辑

复刻 jsoneditoronline 的核心能力，编辑器内核是 [`vanilla-jsoneditor`](https://github.com/josdejong/svelte-jsoneditor)：

- 左右两个文档，各自可切换文本 / 树 / 表格视图；格式化、压缩、排序、过滤转换、搜索、撤销重做、自动修复都由内核提供。
- 树视图右键（或 Ctrl+Q）打开节点菜单：编辑键值、剪切复制粘贴、复制节点、提取、插入、类型转换。
- 中间操作栏：左右互相复制、把一侧经过转换查询后写入另一侧、结构化差异对比（变更黄、删除红、新增绿）。
- 文档名、视图和内容都保存在 localStorage，刷新后还在；支持打开本地文件、下载、复制全文、单栏最大化。

### 域名替换

1. 配置基准域名（例如 `foo.example.com`），会持久化到 localStorage。
2. 粘贴带 `IP:端口` 的链接，自动把 `IP:端口` 替换成基准域名，路径、query、hash 保持不变，支持多行批量与一键复制。

## 新增工具

在 `src/tools/registry.ts` 的 `tools` 数组里注册即可，顶栏切换和路由会自动生成。`layout: 'workspace'` 让工具占满顶栏以下的整屏（适合编辑器类），`'page'` 则按普通文档滚动。

## 视觉约定

冷灰画布 + 浅瓷卡片：大圆角卡片、柔和投影、胶囊形控件，墨黑 `--primary` 只给主动作与选中态。令牌集中在 `src/styles.css` 顶部的 `:root`，编辑器内核的 `--jse-*` 主题变量也在那里统一覆盖。共享组件：

- `components/Segmented`：滑块式分段控件（顶栏工具切换、视图切换）。
- `components/Icon`：1.6px 描边的线性图标。
