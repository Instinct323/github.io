import { createMarkdownRenderer, resolveRelativePaths, type RenderMarkdownOptions } from './markdown-shared';

export type { RenderMarkdownOptions };

const renderer = createMarkdownRenderer();

export function renderMarkdown(markdown: string, options?: RenderMarkdownOptions): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  let html = renderer.render(markdown);

  if (options?.fileURL) {
    html = resolveRelativePaths(html, options.fileURL);
  }

  return html;
}

export default renderMarkdown;
