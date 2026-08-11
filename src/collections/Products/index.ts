import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { humanFieldAccess, humanOnly, isHumanUser } from '../../access/humanOnly'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { createProductAccess, readProductAccess, updateProductAccess } from './access'
import { productInstallTemplate } from './installDocument'
import { manageAgentProductWorkflow } from './hooks/manageAgentProductWorkflow'
import { revalidateProduct, revalidateProductDelete } from './hooks/revalidateProduct'
import { validateInstallDocument } from './hooks/validateInstallDocument'

export const Products: CollectionConfig<'products'> = {
  slug: 'products',
  labels: {
    singular: '产品',
    plural: '产品',
  },
  access: {
    create: createProductAccess,
    delete: humanOnly,
    read: readProductAccess,
    update: updateProductAccess,
  },
  defaultPopulate: {
    title: true,
    slug: true,
    tagline: true,
    logo: true,
    meta: {
      description: true,
      image: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'products',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'products',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '产品名称',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: '产品介绍',
          fields: [
            {
              name: 'tagline',
              type: 'text',
              label: '宣传语',
              required: true,
            },
            {
              name: 'summary',
              type: 'textarea',
              label: '产品简介',
              required: true,
              admin: {
                rows: 4,
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'logo',
                  type: 'upload',
                  label: '产品图标',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'heroImage',
                  type: 'upload',
                  label: '产品主图或界面截图',
                  relationTo: 'media',
                },
              ],
            },
            {
              name: 'platforms',
              type: 'array',
              label: '支持平台',
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  label: '平台',
                  required: true,
                },
              ],
            },
            {
              name: 'links',
              type: 'array',
              label: '产品链接',
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  label: '名称',
                  required: true,
                },
                {
                  name: 'url',
                  type: 'text',
                  label: '地址',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          label: '功能与内容',
          fields: [
            {
              name: 'features',
              type: 'array',
              label: '功能亮点',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: '标题',
                  required: true,
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: '说明',
                  required: true,
                },
                {
                  name: 'image',
                  type: 'upload',
                  label: '配图',
                  relationTo: 'media',
                },
              ],
            },
            {
              name: 'capabilityGroups',
              type: 'array',
              label: '能力或格式列表',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: '分组标题',
                  required: true,
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: '分组说明',
                },
                {
                  name: 'items',
                  type: 'array',
                  label: '项目',
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      label: '名称',
                      required: true,
                    },
                  ],
                },
              ],
            },
            {
              name: 'additionalContent',
              type: 'richText',
              label: '补充介绍或使用说明',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => [
                  ...rootFeatures,
                  HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
                  FixedToolbarFeature(),
                  InlineToolbarFeature(),
                ],
              }),
            },
          ],
        },
        {
          name: 'installDocument',
          label: 'AI 安装运行文档',
          description: '仅面向 AI/Agent，说明如何安全安装、首次运行、验证和卸载产品。',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'status',
                  type: 'select',
                  label: '验证状态',
                  access: {
                    create: humanFieldAccess,
                    update: humanFieldAccess,
                  },
                  defaultValue: 'draft',
                  options: [
                    { label: '草稿', value: 'draft' },
                    { label: '已审核', value: 'reviewed' },
                    { label: '已验证', value: 'verified' },
                  ],
                },
                {
                  name: 'version',
                  type: 'text',
                  label: '文档版本',
                  defaultValue: '1.0',
                },
                {
                  name: 'riskLevel',
                  type: 'select',
                  label: '安装风险',
                  defaultValue: 'low',
                  options: [
                    { label: '低风险', value: 'low' },
                    { label: '中风险', value: 'medium' },
                    { label: '高风险', value: 'high' },
                  ],
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'requiresApproval',
                  type: 'checkbox',
                  label: '安装前需要人工确认',
                  defaultValue: false,
                },
                {
                  name: 'verifiedAt',
                  type: 'date',
                  label: '最后验证时间',
                  access: {
                    create: humanFieldAccess,
                    update: humanFieldAccess,
                  },
                  admin: {
                    condition: (_data, siblingData) => siblingData?.status === 'verified',
                    date: {
                      pickerAppearance: 'dayAndTime',
                    },
                  },
                },
              ],
            },
            {
              name: 'markdown',
              type: 'textarea',
              label: '安装运行 Markdown',
              defaultValue: productInstallTemplate,
              admin: {
                description: '版本号、下载地址、校验值和来源地址由系统自动生成。',
                rows: 32,
              },
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: true }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'createdByAgent',
      type: 'relationship',
      label: '创建 Agent',
      access: {
        create: () => false,
        read: ({ req }) => isHumanUser(req.user) || req.user?.collection === 'agents',
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: 'agents',
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      label: '安装文档审核人',
      access: {
        create: () => false,
        read: humanFieldAccess,
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      relationTo: 'users',
    },
    {
      name: 'reviewedAt',
      type: 'date',
      label: '安装文档审核时间',
      access: {
        create: () => false,
        read: ({ req }) => isHumanUser(req.user) || req.user?.collection === 'agents',
        update: () => false,
      },
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: '发布时间',
      admin: {
        position: 'sidebar',
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidateProduct],
    afterDelete: [revalidateProductDelete],
    beforeChange: [manageAgentProductWorkflow, populatePublishedAt, validateInstallDocument],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
