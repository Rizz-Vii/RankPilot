import { test, expect } from '@playwright/test'
import type { TestContext } from '../../types/test-context'

const ctx: TestContext = {}

test.describe('Finance Metrics Mode', () => {
    test('mock mode emits mock header', async ({ request }) => {
        process.env.FINANCE_METRICS_MODE = 'mock'
        const res = await request.get('/api/finance')
        expect(res.headers()).toHaveProperty('x-finance-metrics-mock', '1')
    })

    test('live mode emits live header & zeroed metrics', async ({ request }) => {
        process.env.FINANCE_METRICS_MODE = 'live'
        const res = await request.get('/api/finance')
        const body = await res.json()
        expect(res.headers()).toHaveProperty('x-finance-metrics-live', '1')
        expect(body.revenue).toBe(0)
    })

    test('query param override to live', async ({ request }) => {
        process.env.FINANCE_METRICS_MODE = 'mock'
        const res = await request.get('/api/finance?financeMock=0')
        expect(res.headers()).toHaveProperty('x-finance-metrics-live', '1')
    })
})
