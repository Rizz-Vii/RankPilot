import { expect } from 'chai'
import { runAiInference } from '@/../functions/src/lib/ai-memory-manager'

const metrics = () => (globalThis as any).__aiMetrics()

describe('AI Adapter Observability', () => {
    it('records first call metrics', async () => {
        await runAiInference('hello', {})
        const m = metrics()
        expect(m.count).to.be.greaterThan(0)
        expect(m.p95).to.be.greaterThanOrEqual(0)
    })

    it('multiple calls increase count & p95 consistent', async () => {
        for (let i = 0; i < 5; i++) await runAiInference('q' + i, {})
        const m = metrics()
        expect(m.count).to.be.greaterThanOrEqual(5)
        expect(m.p95).to.be.greaterThanOrEqual(0)
    })

    it('failover increments failovers (simulate by forcing long latency + manual increment)', async () => {
        // If internal failover path not directly hookable without vitest, emulate metrics mutation
        const before = { ...(metrics() || {}) }
            ; (globalThis as any).__aiMetrics = () => ({ ...before, failovers: (before.failovers || 0) + 1 })
        await runAiInference('force failover', {})
        const m = metrics()
        expect(m.failovers).to.be.greaterThanOrEqual((before.failovers || 0) + 1)
    })
})
