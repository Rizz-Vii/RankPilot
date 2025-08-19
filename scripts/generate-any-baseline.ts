import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(process.cwd(), 'src')
const OUT_DIR = path.resolve(process.cwd(), 'artifacts/lint')
const OUT_FILE = path.join(OUT_DIR, 'any-baseline.json')

function gatherFiles(dir: string, acc: string[] = []) {
    for (const e of fs.readdirSync(dir)) {
        const full = path.join(dir, e)
        if (fs.statSync(full).isDirectory()) {
            if (full.includes(`${path.sep}testing${path.sep}`)) continue
            gatherFiles(full, acc)
        } else if (/\.(tsx?|jsx?)$/.test(e)) acc.push(full)
    }
    return acc
}

const files = gatherFiles(ROOT)
let total = 0
const fileCounts: Record<string, number> = {}
const anyRegex = /:\s*any\b|any;/g

for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8')
    const matches = txt.match(anyRegex)
    if (matches && matches.length) {
        fileCounts[path.relative(process.cwd(), f)] = matches.length
        total += matches.length
    }
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const payload = { timestamp: Date.now(), totalAny: total, fileCounts }
fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2))
console.log(`Any baseline written: ${OUT_FILE} total=${total}`)
