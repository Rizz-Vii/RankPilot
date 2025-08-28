// RPT-01: AI-gated reporting with size guard
// Uses an injected adapter; falls back to deterministic mock when disabled.

export interface AIAdapter {
    summarize(input: { title: string; bullets: string[]; maxBytes: number }): Promise<string>;
}

export interface ReportInput {
    title: string;
    bullets: string[];
    maxBytes?: number; // hard cap; default 2048 bytes
    sections?: Array<{ title: string; bullets: string[] }>; // optional sectioned summary (RPT-02)
    asCsv?: boolean; // output CSV-like text instead of prose
    adminEnabled?: boolean; // feature flag gate; when false, returns minimal stub
}

export async function generateReport(input: ReportInput, adapter?: AIAdapter): Promise<{ summary: string; truncated: boolean }> {
    const maxBytes = input.maxBytes ?? 2048;
    const safeTitle = input.title.slice(0, 200);
    const bullets = (input.bullets || []).slice(0, 50).map(b => String(b).slice(0, 300));

    // Admin gate
    if (input.adminEnabled === false) {
        const stub = `Report: ${safeTitle}\n- disabled by admin`; // short stub
        return finalize(stub, maxBytes);
    }

    // Sectioned rendering path (non-AI)
    if (Array.isArray(input.sections) && input.sections.length > 0) {
        const sections = input.sections.slice(0, 10).map(s => ({
            title: String(s.title).slice(0, 120),
            bullets: (s.bullets || []).slice(0, 20).map(b => String(b).slice(0, 300))
        }));
        const text = input.asCsv ? renderSectionsAsCsv(safeTitle, sections) : renderSectionsAsText(safeTitle, sections);
        try { const { recordReportSummariesGenerated } = await import('../metrics/unified-metrics'); recordReportSummariesGenerated(1); } catch { /* optional */ }
        return finalize(text, maxBytes);
    }

    const text = adapter
        ? await adapter.summarize({ title: safeTitle, bullets, maxBytes })
        : mockSummarize({ title: safeTitle, bullets, maxBytes });

    try { const { recordReportSummariesGenerated } = await import('../metrics/unified-metrics'); recordReportSummariesGenerated(1); } catch { /* optional */ }
    return finalize(text, maxBytes);
}

function mockSummarize({ title, bullets, maxBytes }: { title: string; bullets: string[]; maxBytes: number }): string {
    const header = `Report: ${title}\n`;
    const body = bullets.map((b, i) => `- ${i + 1}. ${b}`).join('\n');
    const raw = `${header}${body}`;
    // soft-trim to maxBytes + 16 tolerance, real cut happens in generateReport
    const enc = new TextEncoder();
    const bytes = enc.encode(raw);
    if (bytes.length <= maxBytes) return raw;
    const over = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, maxBytes + 16)));
    return over;
}

function renderSectionsAsText(title: string, sections: Array<{ title: string; bullets: string[] }>): string {
    const lines: string[] = [];
    lines.push(`Report: ${title}`);
    for (const s of sections) {
        lines.push(`\n## ${s.title}`);
        for (let i = 0; i < s.bullets.length; i++) {
            lines.push(`- ${i + 1}. ${s.bullets[i]}`);
        }
    }
    return lines.join('\n');
}

function renderSectionsAsCsv(title: string, sections: Array<{ title: string; bullets: string[] }>): string {
    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push('section,item');
    for (const s of sections) {
        for (let i = 0; i < s.bullets.length; i++) {
            const val = s.bullets[i].replaceAll('"', '""');
            lines.push(`"${s.title}","${val}"`);
        }
    }
    return lines.join('\n');
}

function finalize(text: string, maxBytes: number): { summary: string; truncated: boolean } {
    const enc = new TextEncoder();
    const bytes = enc.encode(text);
    if (bytes.length <= maxBytes) return { summary: text, truncated: false };
    const view = bytes.slice(0, maxBytes);
    const out = new TextDecoder().decode(view);
    return { summary: out, truncated: true };
}
