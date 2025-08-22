#!/usr/bin/env ts-node
/**
 * Multi-agent + tool demo.
 * Run: npm run agents:multi-demo
 */
import { createSimpleAgent, createTriageAgent, runAgentOnce } from '../../src/lib/ai/agents/agentAdapter';

async function main() {
    if (!process.env.OPENAI_API_KEY) { console.error('Missing OPENAI_API_KEY'); process.exit(1); }
    process.env.RANKPILOT_AGENTS_ENABLED = 'true';

    // Tool-backed weather stub
    const weatherAgent = await createSimpleAgent({
        name: 'WeatherAgent',
        instructions: 'Provide concise weather summaries using the provided tool results only.',
        tools: [{
            name: 'get_weather',
            description: 'Return synthetic weather for a city',
            schema: () => ({ type: 'object', properties: { city: { type: 'string' } }, required: ['city'], additionalProperties: false }),
            execute: async ({ city }) => `${city}: sunny 24C (synthetic)`
        }]
    });
    if (!weatherAgent) throw new Error('Agents disabled');

    const seoAgent = await createSimpleAgent({
        name: 'SEOAgent',
        instructions: 'Answer SEO best practice questions succinctly.'
    });
    if (!seoAgent) throw new Error('Agents disabled');

    const triage = await createTriageAgent('Triage', [
        'Route user queries:',
        '- If asking about weather or temperature -> handoff to WeatherAgent',
        '- If asking about SEO or ranking -> handoff to SEOAgent',
        'Otherwise answer briefly.'
    ].join('\n'), [weatherAgent, seoAgent]);
    if (!triage) throw new Error('Agents disabled');

    const run1 = await runAgentOnce(triage, { input: 'What is the weather in Paris today?' });
    const run2 = await runAgentOnce(triage, { input: 'Give 2 core SEO ranking factors.' });

    console.log('\n--- Run1 Output ---');
    console.log(run1);
    console.log('\n--- Run2 Output ---');
    console.log(run2);
}

main().catch(e => { console.error(e); process.exit(1); });
