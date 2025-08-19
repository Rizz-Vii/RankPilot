// Mocha-based emulator tests (no vitest dependency)
import { expect } from 'chai'
import { computeNextRun } from '@/lib/scheduler/next-run'
import type { ScheduleConfig } from '@/lib/scheduler/types'

let now = 0
const base = Date.now()
const mockNow = () => base + now

const realNow = Date.now
beforeEach(() => {
    now = 0
    // Override Date.now for deterministic scheduling
    // @ts-ignore
    Date.now = () => mockNow()
})
afterEach(() => {
    // @ts-ignore
    Date.now = realNow
})

describe('Scheduler Emulator', () => {
    it('daily within 24h', () => {
        const cfg: ScheduleConfig = { interval: 'daily', lastRun: base }
        const next = computeNextRun(cfg)
        expect(next - base).to.be.at.most(24 * 3600 * 1000)
    })

    it('hourly within 60m', () => {
        const cfg: ScheduleConfig = { interval: 'hourly', lastRun: base }
        const next = computeNextRun(cfg)
        expect(next - base).to.be.at.most(3600 * 1000)
    })

    it('cron parsed within 48h', () => {
        const cfg: ScheduleConfig = { cron: '0 * * * *' }
        const next = computeNextRun(cfg)
        expect(next - base).to.be.at.most(48 * 3600 * 1000)
    })

    it('invalid mixed config rejected', () => {
        const cfg: ScheduleConfig = { cron: '0 * * * *', interval: 'daily' }
        expect(() => computeNextRun(cfg)).to.throw()
    })

    it('idempotent: no rerun before next', () => {
        const cfg: ScheduleConfig = { interval: 'hourly', lastRun: base }
        const first = computeNextRun(cfg)
        const again = computeNextRun({ ...cfg }) // unchanged
        expect(again).to.equal(first)
        now = 61 * 60 * 1000
        const advanced = computeNextRun({ ...cfg, lastRun: base + now })
        expect(advanced).to.be.greaterThan(first)
    })
})