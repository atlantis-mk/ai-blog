export const aiDocumentTemplate = `# 目标

说明 AI 需要完成的结果。

# 适用场景

说明何时使用这份文档。

# 前置条件

- 列出所需环境、权限和依赖。

# 输入

- 列出执行所需的输入。

# 约束

- 列出不能改变的内容和安全边界。

# 操作步骤

## 1. 第一步

\`\`\`bash
# command
\`\`\`

# 输出结果

说明执行成功后应产生的文件、数据、状态或其他可交付结果。

# 验证方法

说明如何确认任务已经正确完成。

# 异常处理

说明常见失败及处理方式。

# 回滚方式

说明如何安全恢复到操作前状态。
`

export const aiDocumentStatusLabels = {
  draft: '草稿',
  reviewed: '已审核',
  verified: '已验证',
} as const

export const aiDocumentKindLabels = {
  checklist: '检查清单',
  reference: '知识参考',
  runbook: '操作手册',
} as const

export const aiDocumentRiskLabels = {
  high: '高风险',
  low: '低风险',
  medium: '中风险',
} as const
