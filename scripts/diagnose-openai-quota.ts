/** Quick OpenAI quota / key diagnostic.
 * Usage:
 *  OPENAI_API_KEY=sk-... npx ts-node scripts/diagnose-openai-quota.ts
 */
import OpenAI from 'openai';

async function run() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('OPENAI_API_KEY not set');
        process.exit(1);
    }
    const client = new OpenAI({ apiKey });
    const summary: { embedding: Record<string, unknown>; chat: Record<string, unknown> } = { embedding: {}, chat: {} };
    try {
        const emb = await client.embeddings.create({ model: 'text-embedding-3-small', input: 'hello world' });
        summary.embedding.success = true;
        summary.embedding.dim = emb.data?.[0]?.embedding?.length;
    } catch (e: unknown) {
        const err = e && typeof e === 'object' ? e as { message?: string; status?: unknown; code?: unknown } : {};
        summary.embedding.success = false;
        summary.embedding.error = typeof err.message === 'string' ? err.message : String(e);
        summary.embedding.code = err.status ?? err.code;
    }
    try {
        const chat = await client.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Ping (respond with Pong only).' }], max_tokens: 5, temperature: 0 });
        summary.chat.success = true;
        summary.chat.output = chat.choices?.[0]?.message?.content;
        summary.chat.model = (typeof (chat as unknown as { model?: unknown }).model === 'string') ? (chat as unknown as { model?: string }).model : 'gpt-4o-mini';
    } catch (e: unknown) {
        const err = e && typeof e === 'object' ? e as { message?: string; status?: unknown; code?: unknown } : {};
        summary.chat.success = false;
        summary.chat.error = typeof err.message === 'string' ? err.message : String(e);
        summary.chat.code = err.status ?? err.code;
    }
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.chat.success || !summary.embedding.success) process.exitCode = 2;
}

run();
