import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

// Central markdown -> HTML renderer used by chat components.
// Callers MUST still sanitize the resulting HTML (DOMPurify) before injecting.
// We avoid explicit any by locally asserting the minimal chaining + process surface.
export async function renderMarkdownToHtml(text: string): Promise<string> {
    try {
        // unified() returns a typed processor but our strict TS config loses inference; capture then assert minimal surface
        // Helper to coerce the fluent chain without introducing explicit any.
        const build = () => {
            const u = unified();
            // Cast each plugin to a universal plugin signature returning void/unknown.
            (u as unknown as { use: (plugin: unknown) => typeof u }).use(remarkParse);
            (u as unknown as { use: (plugin: unknown) => typeof u }).use(remarkGfm);
            (u as unknown as { use: (plugin: unknown) => typeof u }).use(remarkRehype);
            (u as unknown as { use: (plugin: unknown) => typeof u }).use(rehypeStringify);
            return u;
        };
        const base = build();
        // Narrow to the minimal subset we actually use (process method)
        const processor = base as unknown as { process: (value: string) => Promise<{ value: unknown }> };
        const file = await processor.process(text);
        return String(file.value ?? file);
    } catch {
        // Graceful degrade (escape angle brackets to avoid raw HTML injection)
        return text.replace(/</g, '&lt;');
    }
}
