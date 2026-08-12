import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  LinkJSXConverter,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import { CodeBlock, CodeBlockProps } from '@/blocks/Code/Component'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/utilities/ui'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | BannerBlockProps | CodeBlockProps>

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object') {
    throw new Error('Expected value to be an object')
  }
  const slug = value.slug
  return relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  blocks: {
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
    mediaBlock: ({ node }) => (
      <MediaBlock
        className="col-start-1 col-span-3"
        imgClassName="m-0"
        {...node.fields}
        captionClassName="mx-auto max-w-[48rem]"
        enableGutter={false}
        disableInnerContainer={true}
      />
    ),
    code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
    cta: ({ node }) => <CallToActionBlock {...node.fields} />,
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
  leadingH1ToRemove?: string
} & React.HTMLAttributes<HTMLDivElement>

type TextNode = {
  children?: TextNode[]
  text?: string
}

const getNodeText = (node: TextNode): string =>
  typeof node.text === 'string' ? node.text : (node.children || []).map(getNodeText).join('')

export const removeDuplicateLeadingH1 = (
  data: DefaultTypedEditorState,
  heading?: string,
): DefaultTypedEditorState => {
  if (!heading) return data

  const firstNode = data.root.children[0] as TextNode & { tag?: string; type?: string }
  if (
    firstNode?.type !== 'heading' ||
    firstNode.tag !== 'h1' ||
    getNodeText(firstNode).trim() !== heading.trim()
  ) {
    return data
  }

  return {
    ...data,
    root: {
      ...data.root,
      children: data.root.children.slice(1),
    },
  }
}

export default function RichText(props: Props) {
  const {
    className,
    data,
    enableProse = true,
    enableGutter = true,
    leadingH1ToRemove,
    ...rest
  } = props
  return (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext',
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md dark:prose-invert': enableProse,
        },
        className,
      )}
      data={removeDuplicateLeadingH1(data, leadingH1ToRemove)}
      {...rest}
    />
  )
}
