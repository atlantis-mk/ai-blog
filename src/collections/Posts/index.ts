import type { CollectionConfig } from 'payload'

import { humanFieldAccess, humanOnly, isHumanUser } from '../../access/humanOnly'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { createPostAccess, readPostAccess, updatePostAccess } from './access'
import {
  aiDocumentTemplate,
  aiDocumentURLPlaceholder,
  aiPromptTemplate,
} from './aiDocument'
import { postEditor } from './editor'
import { manageAgentWorkflow } from './hooks/manageAgentWorkflow'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'
import { validateAIDocument } from './hooks/validateAIDocument'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from 'payload'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  labels: {
    singular: '文章',
    plural: '文章',
  },
  access: {
    create: createPostAccess,
    delete: humanOnly,
    read: readPostAccess,
    update: updatePostAccess,
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'posts',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'posts',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '标题',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              label: '头图',
              relationTo: 'media',
            },
            {
              name: 'content',
              type: 'richText',
              editor: postEditor,
              label: false,
              required: true,
            },
          ],
          label: '人类阅读版',
        },
        {
          name: 'aiDocument',
          label: 'AI 文档',
          description: '提供给 AI/Agent 直接读取和执行的 Markdown 文档。文章发布前必须完成审核。',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'kind',
                  type: 'select',
                  label: '文档类型',
                  defaultValue: 'runbook',
                  options: [
                    { label: '操作手册', value: 'runbook' },
                    { label: '知识参考', value: 'reference' },
                    { label: '检查清单', value: 'checklist' },
                  ],
                },
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
              ],
            },
            {
              name: 'compatibility',
              type: 'textarea',
              label: '适用环境',
              admin: {
                description: '例如：Payload 3.86、Node.js 22、SQLite。',
                rows: 3,
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'riskLevel',
                  type: 'select',
                  label: '操作风险',
                  defaultValue: 'low',
                  options: [
                    { label: '低风险', value: 'low' },
                    { label: '中风险', value: 'medium' },
                    { label: '高风险', value: 'high' },
                  ],
                },
                {
                  name: 'requiresApproval',
                  type: 'checkbox',
                  label: '执行前需要人工确认',
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
              label: 'Markdown 正文',
              defaultValue: aiDocumentTemplate,
              admin: {
                description: '不要重复标题和版本信息；系统会自动生成 YAML frontmatter。',
                rows: 32,
              },
            },
            {
              name: 'prompt',
              type: 'textarea',
              label: '复制给 AI 的提示词',
              validate: (value) =>
                !value ||
                value.includes(aiDocumentURLPlaceholder) ||
                `提示词必须包含 ${aiDocumentURLPlaceholder}，复制时系统会自动替换为当前 AI 文档链接。`,
              admin: {
                description: `发布后，${aiDocumentURLPlaceholder} 会自动替换为当前 B 文链接；其他尖括号占位内容由读者复制后填写。`,
                placeholder: aiPromptTemplate,
                rows: 18,
              },
            },
          ],
        },
        {
          fields: [
            {
              name: 'relatedPosts',
              type: 'relationship',
              label: '相关文章',
              admin: {
                position: 'sidebar',
              },
              filterOptions: ({ id }) => {
                return {
                  id: {
                    not_in: [id],
                  },
                }
              },
              hasMany: true,
              relationTo: 'posts',
            },
            {
              name: 'categories',
              type: 'relationship',
              label: '分类',
              admin: {
                position: 'sidebar',
              },
              hasMany: true,
              relationTo: 'categories',
            },
          ],
          label: '关联信息',
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
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
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
      label: '审核人',
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
      label: '审核时间',
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
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'authors',
      type: 'relationship',
      label: '作者',
      admin: {
        position: 'sidebar',
      },
      hasMany: true,
      relationTo: 'users',
    },
    // This field is only used to populate the user data via the `populateAuthors` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedAuthors',
      type: 'array',
      label: '作者信息',
      access: {
        update: () => false,
      },
      admin: {
        disabled: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
    afterDelete: [revalidateDelete],
    beforeChange: [manageAgentWorkflow, validateAIDocument],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
