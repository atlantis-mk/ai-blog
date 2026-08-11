import type { CollectionConfig } from 'payload'

import { humanOnly, isHumanUser } from '@/access/humanOnly'
import { agentScopes } from '@/mcp/context'

export const Agents: CollectionConfig<'agents'> = {
  slug: 'agents',
  labels: {
    singular: 'Agent',
    plural: 'Agents',
  },
  access: {
    admin: ({ req }) => isHumanUser(req.user),
    create: humanOnly,
    // Keep audit relationships intact. Revoke access by disabling or rotating the API key.
    delete: () => false,
    read: humanOnly,
    update: humanOnly,
  },
  admin: {
    defaultColumns: ['name', 'active', 'scopes', 'expiresAt', 'updatedAt'],
    group: 'Agent 发布',
    useAsTitle: 'name',
  },
  auth: {
    disableLocalStrategy: true,
    useAPIKey: true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: '名称',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: '说明',
    },
    {
      name: 'active',
      type: 'checkbox',
      label: '启用',
      defaultValue: true,
      required: true,
    },
    {
      name: 'scopes',
      type: 'select',
      label: '权限范围',
      defaultValue: ['posts:read', 'posts:write'],
      hasMany: true,
      options: agentScopes.map((scope) => ({ label: scope, value: scope })),
      required: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: '过期时间',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: '留空表示不过期。',
      },
    },
  ],
  timestamps: true,
}
