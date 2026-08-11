import type { CollectionConfig } from 'payload'

import { humanOnly, isHumanUser } from '@/access/humanOnly'

export const MCPAuditLogs: CollectionConfig<'mcp-audit-logs'> = {
  slug: 'mcp-audit-logs',
  labels: {
    singular: 'MCP 审计记录',
    plural: 'MCP 审计记录',
  },
  access: {
    admin: ({ req }) => isHumanUser(req.user),
    create: () => false,
    delete: () => false,
    read: humanOnly,
    update: () => false,
  },
  admin: {
    defaultColumns: ['tool', 'agent', 'post', 'result', 'requestId', 'createdAt'],
    group: 'Agent 发布',
    useAsTitle: 'requestId',
  },
  fields: [
    {
      name: 'agent',
      type: 'relationship',
      label: 'Agent',
      relationTo: 'agents',
      required: true,
    },
    {
      name: 'tool',
      type: 'text',
      label: '工具',
      index: true,
      required: true,
    },
    {
      name: 'post',
      type: 'relationship',
      label: '文章',
      relationTo: 'posts',
    },
    {
      name: 'requestId',
      type: 'text',
      label: '请求 ID',
      index: true,
      required: true,
    },
    {
      name: 'result',
      type: 'select',
      label: '结果',
      options: [
        { label: '成功', value: 'success' },
        { label: '失败', value: 'error' },
      ],
      required: true,
    },
    {
      name: 'errorCode',
      type: 'text',
      label: '错误码',
    },
    {
      name: 'message',
      type: 'textarea',
      label: '摘要',
      maxLength: 1000,
    },
  ],
  timestamps: true,
}
