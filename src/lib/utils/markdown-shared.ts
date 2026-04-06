import MarkdownIt from 'markdown-it';

export interface RenderMarkdownOptions {
  fileURL?: string;
}

export function resolveRelativePaths(html: string, fileURL: string): string {
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

export interface MarkdownRenderer {
  render(_markdown: string): string;
}

export function createMarkdownRenderer(): MarkdownRenderer {
  const md = new MarkdownIt({
    html: false,
    xhtmlOut: false,
    breaks: false,
    linkify: false,
    typographer: false,
  });

  return {
    render: (_markdown: string): string => md.render(_markdown),
  };
}
