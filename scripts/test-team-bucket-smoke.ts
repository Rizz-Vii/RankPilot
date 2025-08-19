/* Smoke: verify no unexpected 429s under nominal usage */
import fetch from 'node-fetch'

async function run() {
    const base = process.env.SMOKE_BASE_URL || 'http://localhost:3000'
    process.env.ENABLE_TEAM_BUCKET_LIMIT = process.env.ENABLE_TEAM_BUCKET_LIMIT || '1'
    const team = 'smokeTeam'
    for (let i = 0; i < 5; i++) {
        const r = await fetch(`${base}/api/seo-audit`, { headers: { 'x-team-id': team } })
        console.log(i, r.status, r.headers.get('x-team-ratelimit-remaining'))
        if (r.status === 429) {
            console.error('Unexpected early 429')
            process.exit(1)
        }
    }
    console.log('Team bucket smoke OK')
}

run().catch(e => { console.error(e); process.exit(1) })
