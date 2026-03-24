import MarkdownIt from 'markdown-it';

/**
 * Shared markdown renderer using markdown-it
 * Handles basic markdown elements: headers, bold, links, images, lists
 */
const md = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: false,
  linkify: false,
  typographer: false,
});

/**
 * Render markdown string to HTML
 * @param markdown - Raw markdown content
 * @returns HTML string
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  return md.render(markdown);
}

export default renderMarkdown;
