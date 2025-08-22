#!/usr/bin/env ts-node
/**
 * Smoke test for the new OpenAI Agents adapter. Run via:
 *   npm run agents:smoke
 * Requires OPENAI_API_KEY in env. Uses feature flag RANKPILOT_AGENTS_ENABLED.
 */
import { createSimpleAgent, runAgentOnce } from '../../src/lib/ai/agents/agentAdapter';

async function main() {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Missing OPENAI_API_KEY – aborting.');
        process.exit(1);
    }
    process.env.RANKPILOT_AGENTS_ENABLED = process.env.RANKPILOT_AGENTS_ENABLED || 'true';
    const agent = await createSimpleAgent({
        name: 'HaikuAgent',
        instructions: 'Respond ONLY as a concise haiku about the user input.'
    });
    const res = await runAgentOnce(agent, { input: 'Describe successful SEO strategy basics.' });
    if (!res.ok) {
        console.error('Agent run failed:', res.error);
        process.exit(2);
    }
    console.log('\n--- Agent Output ---');
    console.log(res.output);
    console.log('Meta:', res.meta);
}

main().catch(e => { console.error(e); process.exit(99); });
