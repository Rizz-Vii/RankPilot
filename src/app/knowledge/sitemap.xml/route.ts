import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        let urls: string[] = [];
        try {
            const snap = await adminDb.collection('neuroSeoAnalyses').orderBy('createdAt', 'desc').limit(50).get();
            if (snap && !snap.empty) {
                urls = snap.docs.map(d => `/knowledge/${d.id}.jsonld`);
            }
        } catch {
            urls = [];
        }

        // Always include the collection endpoint
        const base = `https://rankpilot.ai`;
        const entries = [`${base}/.well-known/knowledge`, ...urls.map(u => `${base}${u}`)];

        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(u => `  <url><loc>${u}</loc><lastmod>${new Date().toISOString()}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`).join('\n')}\n</urlset>`;
        return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        return new NextResponse(`<!-- error: ${msg} -->`, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    }
}
