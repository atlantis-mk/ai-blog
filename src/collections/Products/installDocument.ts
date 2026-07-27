export const productInstallTemplate = `# 安装目标

说明需要安装的产品和完成后的状态。

# 系统要求

- 列出支持的操作系统、架构、磁盘空间和权限。

# 安装步骤

## 1. 下载安装包

只使用文档 frontmatter 中的官方下载地址。

## 2. 安装产品

说明具体安装步骤。

# 首次运行

说明第一次启动、授权和基础配置方法。

# 验证方法

说明如何确认产品已经正确安装并可以运行。

# 常见问题

列出安装或启动时的常见问题和解决方法。

# 卸载或回滚

说明如何安全卸载产品或恢复安装前状态。
`

export const productInstallStatusLabels = {
  draft: '草稿',
  reviewed: '已审核',
  verified: '已验证',
} as const

export const productRiskLabels = {
  high: '高风险',
  low: '低风险',
  medium: '中风险',
} as const
