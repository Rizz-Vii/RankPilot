import type { ScheduleConfig } from './types'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function computeNextRun(cfg: ScheduleConfig): number {
    if (!cfg) throw new Error('config required')
    if (cfg.cron && cfg.interval) throw new Error('Specify either cron or interval, not both')
    const now = Date.now()
    if (cfg.interval) {
        const base = cfg.lastRun ?? now
        if (cfg.interval === 'daily') return base + DAY_MS
        if (cfg.interval === 'hourly') return base + HOUR_MS
        throw new Error('Unsupported interval')
    }
    if (cfg.cron) {
        // Minimal cron: "m h * * *" allowing * tokens; search next match ≤48h
        const parts = cfg.cron.trim().split(/\s+/)
        if (parts.length !== 5) throw new Error('Invalid cron format')
        const [minTok, hourTok] = parts
        const matchMinute = (m: number) => (minTok === '*' ? true : Number(minTok) === m)
        const matchHour = (h: number) => (hourTok === '*' ? true : Number(hourTok) === h)
        let t = now - (now % MINUTE_MS) + MINUTE_MS // next minute boundary
        const limit = now + 48 * HOUR_MS
        while (t <= limit) {
            const d = new Date(t)
            if (matchMinute(d.getMinutes()) && matchHour(d.getHours())) {
                return t
            }
            t += MINUTE_MS
        }
        throw new Error('No cron occurrence within 48h')
    }
    throw new Error('Missing schedule definition')
}
