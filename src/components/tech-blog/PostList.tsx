import Link from 'next/link'

import type { Post } from '@/payload-types'
import { formatDateTime } from '@/utilities/formatDateTime'

type PostPreview = Pick<Post, 'categories' | 'id' | 'meta' | 'publishedAt' | 'slug' | 'title' | 'updatedAt'>

function CategoryLabel({ post }: { post: PostPreview }) {
  const category = post.categories?.find((item) => typeof item === 'object')
  return <>{typeof category === 'object' ? category.title : '文章'}</>
}

export function PostList({ posts }: { posts: PostPreview[] }) {
  if (!posts.length) {
    return <p className="py-8 text-sm text-muted-foreground">文章发布后会显示在这里。</p>
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {posts.map((post) => (
        <article className="group grid gap-3 py-5 md:grid-cols-[8rem_1fr_auto] md:items-baseline" key={post.id}>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <CategoryLabel post={post} />
          </p>
          <div>
            <Link className="text-lg font-medium tracking-[-0.02em] hover:underline" href={`/posts/${post.slug}`}>
              {post.title}
            </Link>
            {post.meta?.description && (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{post.meta.description}</p>
            )}
          </div>
          <time className="font-mono text-[11px] text-muted-foreground" dateTime={post.publishedAt || post.updatedAt}>
            {formatDateTime(post.publishedAt || post.updatedAt)}
          </time>
        </article>
      ))}
    </div>
  )
}
