import {
  BlockquoteFeature,
  BlocksFeature,
  ChecklistFeature,
  EXPERIMENTAL_TableFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineCodeFeature,
  InlineToolbarFeature,
  OrderedListFeature,
  StrikethroughFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { Banner } from '@/blocks/Banner/config'
import { Code } from '@/blocks/Code/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'

export const postEditor = lexicalEditor({
  features: ({ rootFeatures }) => [
    ...rootFeatures,
    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
    BlockquoteFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    ChecklistFeature(),
    InlineCodeFeature(),
    StrikethroughFeature(),
    EXPERIMENTAL_TableFeature(),
    BlocksFeature({ blocks: [Banner, Code, MediaBlock] }),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
    HorizontalRuleFeature(),
  ],
})
