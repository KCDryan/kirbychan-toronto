import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORY_SLUGS, type BlogCategory } from './blog';
import { assignCardHoods, namedHood } from './post-links';

let cardPhotoMemo: Promise<Map<string, string>> | undefined;

/** The neighbourhood photo on each post's blog card, worked out once across every post (see assignCardHoods). */
export const cardPhotos = () =>
  (cardPhotoMemo ??= publishedPosts().then((posts) =>
    assignCardHoods(
      posts.map((p) => ({
        slug: p.id.split('/').pop()!,
        published: p.data.published.valueOf(),
        named: namedHood([p.data.neighbourhood, p.data.related[0]], `${p.data.h1} ${p.data.description}`),
      }))
    )
  ));

/** Published posts, newest first. Ties break on the slug so order is stable. */
export async function publishedPosts(): Promise<CollectionEntry<'blog'>[]> {
  return (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf() || a.id.localeCompare(b.id)
  );
}

/** Categories that have at least one published post, in the defined order. */
export function usedCategories(posts: CollectionEntry<'blog'>[]): BlogCategory[] {
  const used = new Set(posts.map((p) => p.data.category));
  return CATEGORY_SLUGS.filter((c) => used.has(c));
}
