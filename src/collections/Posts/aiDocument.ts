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

export const aiDocumentURLPlaceholder = '<粘贴链接>'

export const aiPromptTemplate = `请处理以下由我授权管理的服务器：
- SSH 用户：<例如 root>
- 服务器地址：<IP 或域名>
- SSH 端口：<例如 22>
- SSH 密钥文件：<可选；只填写路径，不要粘贴私钥内容>

AI 操作文档：${aiDocumentURLPlaceholder}

现在先不要连接或修改服务器。请先读取文档并输出：
1. 执行计划；
2. 将要连接的目标主机；
3. 文档要求的预期输出。

等待我确认后再执行。完成后按文档中的“预期输出”汇总结果，提供面板访问方式、两个节点连接、端口跳跃信息和验证结果。

不得要求或输出服务器密码、SSH 私钥内容；过程日志不要展开敏感值，节点连接只在最终汇总中显示。`

export const buildAIDocumentPrompt = (promptTemplate: string, markdownURL: string) =>
  promptTemplate.replaceAll(aiDocumentURLPlaceholder, markdownURL).trim()

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
