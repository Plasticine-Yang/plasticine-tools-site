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

### 域名替换

1. 配置基准域名（例如 `foo.example.com`），会持久化到 localStorage，刷新后仍在。
2. 粘贴带 `IP:端口` 的链接，例如 `http://192.168.1.100:8800/s/example-path?viewToken=EXAMPLE_TOKEN`。
3. 自动把 `IP:端口` 替换成基准域名，路径、query、hash 保持不变，支持多行批量转换与一键复制。

## 新增工具

在 `src/tools/registry.ts` 的 `tools` 数组里注册即可，侧边栏和路由会自动生成。
