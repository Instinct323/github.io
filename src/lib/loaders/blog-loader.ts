import { statSync } from 'fs';
import { parseMarkdownWithFrontmatter } from '../utils/markdown';

export interface BlogPost {
  title: string;
  date: Date;
  content: string;
  slug: string;
  baseUrl: string;
}

const BLOG_POST_MODULES = import.meta.glob<string>(
  '../../../content/blog/*/README.md',
  { eager: true, query: '?raw', import: 'default' },
);

function extractSlugFromPath(filePath: string): string {
  const match = filePath.match(/blog\/([^/]+)\/README\.md$/);
  if (!match) {
    throw new Error(`Cannot extract slug from path: ${filePath}`);
  }
  return match[1];
}

export function loadBlogPosts(): BlogPost[] {
  const entries = Object.entries(BLOG_POST_MODULES);

  if (entries.length === 0) {
    throw new Error('No blog posts found in content/blog/*/README.md');
  }

  const posts: BlogPost[] = [];

  for (const [filePath, content] of entries) {
    const parsed = parseMarkdownWithFrontmatter(content);
    const slug = extractSlugFromPath(filePath);
    const fileURL = new URL(filePath, import.meta.url).href;
    const absolutePath = new URL(filePath, import.meta.url).pathname;
    const stats = statSync(absolutePath);
    const date = stats.mtime;

    const title = parsed.title ?? slug;

    posts.push({
      title,
      date,
      content: parsed.content,
      slug,
      baseUrl: fileURL,
    });
  }

  posts.sort((a, b) => b.date.getTime() - a.date.getTime());

  return posts;
}
