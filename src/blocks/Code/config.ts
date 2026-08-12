import { CodeBlock } from '@payloadcms/richtext-lexical'

export const Code = CodeBlock({
  defaultLanguage: 'typescript',
  fieldOverrides: {
    interfaceName: 'CodeBlock',
  },
  languages: {
    bash: 'Bash',
    css: 'CSS',
    html: 'HTML',
    javascript: 'JavaScript',
    json: 'JSON',
    markdown: 'Markdown',
    sql: 'SQL',
    typescript: 'TypeScript',
    yaml: 'YAML',
  },
  slug: 'code',
})
