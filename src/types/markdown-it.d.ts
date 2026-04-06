declare module 'markdown-it' {
  interface Options {
    html?: boolean;
    xhtmlOut?: boolean;
    breaks?: boolean;
    linkify?: boolean;
    typographer?: boolean;
    [key: string]: unknown;
  }
}
declare module '@mdit/plugin-katex';
