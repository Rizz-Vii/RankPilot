// Ambient module declarations for markdown/remark/unified ecosystem packages without bundled TypeScript types
// Remove when proper type definitions are available.
declare module "remark-gfm";
declare module "remark-parse";
declare module "remark-rehype";
declare module "rehype-stringify";

declare module "unified" {
  // Minimal factory signature; refine when real types installed.
  export function unified(): {
    use: (...args: unknown[]) => unknown;
    process: (...args: unknown[]) => Promise<unknown>;
  };
}
