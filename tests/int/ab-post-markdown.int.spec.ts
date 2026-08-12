import config from '@/payload.config'
import { removeDuplicateLeadingH1 } from '@/components/RichText'
import { markdownToPostContent, postContentToMarkdown } from '@/utilities/abPost'
import { getPayload, type Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

type LexicalNode = {
  children?: LexicalNode[]
  fields?: {
    blockType?: string
    code?: string
    language?: string
  }
  format?: number
  listType?: string
  tag?: string
  text?: string
  type: string
}

const flattenNodes = (nodes: LexicalNode[]): LexicalNode[] =>
  nodes.flatMap((node) => [node, ...flattenNodes(node.children || [])])

describe('A post Markdown conversion', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('preserves the formatting supported by the article editor', () => {
    const markdown = `# 格式测试

> 引用内容

1. 第一项
2. 第二项

- 无序项目
- [x] 已完成项目

| 名称 | 状态 |
| --- | --- |
| Payload | 正常 |

包含 \`行内代码\` 和 ~~删除线~~。

\`\`\`bash
pnpm test
\`\`\`

\`\`\`text
http://127.0.0.1:8080/example/
\`\`\`
`

    const content = markdownToPostContent(payload, markdown)
    const nodes = flattenNodes(content.root.children as LexicalNode[])

    expect(nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'h1', type: 'heading' }),
        expect.objectContaining({ type: 'quote' }),
        expect.objectContaining({ listType: 'number', type: 'list' }),
        expect.objectContaining({ listType: 'bullet', type: 'list' }),
        expect.objectContaining({ listType: 'check', type: 'list' }),
        expect.objectContaining({ type: 'table' }),
        expect.objectContaining({ type: 'tablecell' }),
        expect.objectContaining({
          fields: expect.objectContaining({
            blockType: 'code',
            code: 'pnpm test',
            language: 'bash',
          }),
          type: 'block',
        }),
        expect.objectContaining({
          fields: expect.objectContaining({
            blockType: 'code',
            code: 'http://127.0.0.1:8080/example/',
            language: 'text',
          }),
          type: 'block',
        }),
      ]),
    )
    expect((nodes.find((node) => node.text === '行内代码')?.format ?? 0) & 16).toBe(16)
    expect((nodes.find((node) => node.text === '删除线')?.format ?? 0) & 4).toBe(4)

    const roundTripMarkdown = postContentToMarkdown(payload, content)
    expect(roundTripMarkdown).toContain('> 引用内容')
    expect(roundTripMarkdown).toContain('| 名称 | 状态 |')
    expect(roundTripMarkdown).toContain('```bash\npnpm test\n```')
    expect(roundTripMarkdown).toContain('```text\nhttp://127.0.0.1:8080/example/\n```')
  })

  it('removes a duplicated page title without mutating the stored editor state', () => {
    const content = markdownToPostContent(payload, '# 页面标题\n\n正文内容。')
    const renderedContent = removeDuplicateLeadingH1(content, '页面标题')

    expect(renderedContent.root.children[0]).toMatchObject({ type: 'paragraph' })
    expect(content.root.children[0]).toMatchObject({ tag: 'h1', type: 'heading' })
  })

  it('normalizes code fence aliases and falls back to plain text', () => {
    const markdown = `\`\`\`python
print('python')
\`\`\`

\`\`\`C++
int main() {}
\`\`\`

\`\`\`js title="example"
console.log('javascript')
\`\`\`

\`\`\`{.ruby}
puts 'ruby'
\`\`\`

\`\`\`objective-c
id value;
\`\`\`

\`\`\`unknown-language
kept as plain text
\`\`\`
`

    const content = markdownToPostContent(payload, markdown)
    const codeLanguages = flattenNodes(content.root.children as LexicalNode[])
      .filter((node) => node.fields?.blockType === 'code')
      .map((node) => node.fields?.language)

    expect(codeLanguages).toEqual([
      'python',
      'cpp',
      'javascript',
      'ruby',
      'objectivec',
      'text',
    ])

    const roundTripMarkdown = postContentToMarkdown(payload, content)
    expect(roundTripMarkdown).toContain('```cpp\nint main() {}\n```')
    expect(roundTripMarkdown).toContain("```javascript\nconsole.log('javascript')\n```")
    expect(roundTripMarkdown).toContain('```text\nkept as plain text\n```')
  })
})
