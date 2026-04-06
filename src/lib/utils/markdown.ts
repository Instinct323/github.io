import matter from 'gray-matter';
import { katex } from '@mdit/plugin-katex';
import MarkdownIt from 'markdown-it';
import { resolveRelativePaths, type RenderMarkdownOptions } from './markdown-shared';

export type { RenderMarkdownOptions };
export { renderMarkdown } from './markdown-client';

const mdWithKatex = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: false,
  linkify: false,
  typographer: false,
}).use(katex);

export function renderMarkdownWithKatex(markdown: string, options?: RenderMarkdownOptions): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let html = mdWithKatex.render(markdown);

  if (options?.fileURL) {
    html = resolveRelativePaths(html, options.fileURL);
  }

  return html;
}

export interface ParseMarkdownResult {
  title: string | null;
  content: string;
}

export function parseMarkdownWithFrontmatter(markdown: string): ParseMarkdownResult {
  if (!markdown || typeof markdown !== 'string') {
    throw new Error('Invalid markdown input');
  }

  const parsed = matter(markdown);
  const title = parsed.data?.title;
  const validTitle = typeof title === 'string' && title.trim().length > 0 ? title.trim() : null;

  return {
    title: validTitle,
    content: parsed.content.trim(),
  };
}
