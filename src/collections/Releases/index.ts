import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { revalidateRelease, revalidateReleaseDelete } from './hooks/revalidateRelease'
import { validateRelease } from './hooks/validateRelease'

export const Releases: CollectionConfig<'releases'> = {
  slug: 'releases',
  labels: {
    singular: '产品版本',
    plural: '产品版本',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['version', 'product', 'channel', 'releasedAt', 'updatedAt'],
    useAsTitle: 'version',
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      label: '所属产品',
      relationTo: 'products',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'version',
          type: 'text',
          label: '版本号',
          required: true,
        },
        {
          name: 'channel',
          type: 'select',
          label: '发布通道',
          defaultValue: 'stable',
          options: [
            { label: '稳定版', value: 'stable' },
            { label: '测试版', value: 'beta' },
            { label: '历史版', value: 'legacy' },
          ],
          required: true,
        },
        {
          name: 'releasedAt',
          type: 'date',
          label: '发布日期',
          admin: {
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'file',
          type: 'upload',
          label: '安装文件',
          relationTo: 'media',
        },
        {
          name: 'downloadURL',
          type: 'text',
          label: '外部下载地址',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'fileSize',
          type: 'text',
          label: '文件大小',
          admin: {
            description: '例如：35.9 MB',
          },
        },
        {
          name: 'architecture',
          type: 'text',
          label: '架构',
          admin: {
            description: '例如：Apple Silicon / Intel / Universal',
          },
        },
      ],
    },
    {
      name: 'systemRequirements',
      type: 'textarea',
      label: '系统要求',
      admin: {
        rows: 3,
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'checksumAlgorithm',
          type: 'select',
          label: '校验算法',
          defaultValue: 'sha256',
          options: [
            { label: 'SHA-256', value: 'sha256' },
            { label: 'SHA-512', value: 'sha512' },
            { label: 'MD5', value: 'md5' },
          ],
        },
        {
          name: 'checksum',
          type: 'text',
          label: '校验值',
        },
      ],
    },
    {
      name: 'changelogURL',
      type: 'text',
      label: '更新日志地址',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: '版本说明',
      admin: {
        rows: 5,
      },
    },
  ],
  hooks: {
    afterChange: [revalidateRelease],
    afterDelete: [revalidateReleaseDelete],
    beforeChange: [validateRelease],
  },
  versions: {
    drafts: {
      autosave: true,
      schedulePublish: true,
    },
    maxPerDoc: 100,
  },
}
