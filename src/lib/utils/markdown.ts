import MarkdownIt from 'markdown-it';
import matter from 'gray-matter';
import { katex } from '@mdit/plugin-katex';

export interface RenderMarkdownOptions {
  fileURL?: string;
}

const md = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: false,
  linkify: false,
  typographer: false,
}).use(katex);

function resolveRelativePaths(html: string, fileURL: string): string {
  try {
    const baseURL = new URL('.', fileURL).href;

    return html.replace(
      /(?:src|href)=["']([^"']+)["']/g,
      (match, path) => {
        if (
          path.startsWith('http://') ||
          path.startsWith('https://') ||
          path.startsWith('data:') ||
          path.startsWith('#') ||
          path.startsWith('mailto:') ||
          path.startsWith('tel:')
        ) {
          return match;
        }

        const resolved = new URL(path, baseURL);
        let resolvedPath = resolved.href;

        if (resolvedPath.startsWith('file://')) {
          const contentMatch = resolvedPath.match(/\/content\/([^/]+)\/([^/]+)/);
          if (contentMatch) {
            const section = contentMatch[1];
            const slug = contentMatch[2];
            const assetMatch = resolvedPath.match(/\/assets\/(.+)$/);
            if (assetMatch) {
              resolvedPath = `/${section}/${slug}/assets/${assetMatch[1]}`;
            }
          }
        }

        return match.replace(path, resolvedPath);
      }
    );
  } catch {
    return html;
  }
}

export function renderMarkdown(markdown: string, options?: RenderMarkdownOptions): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let html = md.render(markdown);

  if (options?.fileURL) {
    html = resolveRelativePaths(html, options.fileURL);
  }

  return html;
}

export default renderMarkdown;

interface ParseMarkdownResult {
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
