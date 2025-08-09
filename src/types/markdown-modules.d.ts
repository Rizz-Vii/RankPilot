// Ambient module declarations for markdown/remark/unified ecosystem packages without bundled TypeScript types
// Remove when proper type definitions are available.
declare module 'remark-gfm';
declare module 'remark-parse';
declare module 'remark-rehype';
declare module 'rehype-stringify';

declare module 'unified' {
    export function unified(): any;
}
