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
    const summary: any = { embedding: {}, chat: {} };
    try {
        const emb = await client.embeddings.create({ model: 'text-embedding-3-small', input: 'hello world' });
        summary.embedding.success = true;
        summary.embedding.dim = emb.data?.[0]?.embedding?.length;
    } catch (e: any) {
        summary.embedding.success = false;
        summary.embedding.error = e?.message;
        summary.embedding.code = e?.status || e?.code;
    }
    try {
        const chat = await client.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Ping (respond with Pong only).' }], max_tokens: 5, temperature: 0 });
        summary.chat.success = true;
        summary.chat.output = chat.choices?.[0]?.message?.content;
        summary.chat.model = (chat as any).model || 'gpt-4o-mini';
    } catch (e: any) {
        summary.chat.success = false;
        summary.chat.error = e?.message;
        summary.chat.code = e?.status || e?.code;
    }
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.chat.success || !summary.embedding.success) process.exitCode = 2;
}

run();
