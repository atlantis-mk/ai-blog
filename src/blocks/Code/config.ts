import { CodeBlock } from '@payloadcms/richtext-lexical'
import type { Block, Field, TextField } from 'payload'

import { codeBlockLanguages } from './languages'

const codeBlock = CodeBlock({
  defaultLanguage: 'text',
  fieldOverrides: {
    interfaceName: 'CodeBlock',
  },
  languages: codeBlockLanguages,
  slug: 'code',
})

const languageField: TextField = {
  name: 'language',
  type: 'text',
  admin: {
    hidden: true,
  },
  defaultValue: 'text',
}

export const Code: Block = {
  ...codeBlock,
  fields: codeBlock.fields.map((field): Field => {
    if (!('name' in field) || field.name !== 'language') return field

    // Markdown info strings are open-ended. Keeping this as text prevents an older or
    // externally-created language tag from making the whole post impossible to publish.
    return languageField
  }),
}
