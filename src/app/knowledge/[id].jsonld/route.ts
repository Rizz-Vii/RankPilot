import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Next 15 type-checker expects RouteContext.params to be a Promise<SegmentParams>
type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

export async function GET(_: Request, ctx: RouteContext): Promise<Response> {
    const params = await ctx.params;
    const rawId = params?.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId)?.replace(/\.jsonld$/i, '') || '';
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
    try {
        const doc = await adminDb.collection('neuroSeoAnalyses').doc(id).get();
        if (!doc || !doc.exists) return NextResponse.json({ error: 'not found' }, { status: 404 });
        const data = doc.data() as Record<string, unknown> | undefined;
        const rawUrls = (data && (data as { urls?: unknown }).urls) as unknown;
        const urls: string[] = Array.isArray(rawUrls) ? rawUrls.filter((u): u is string => typeof u === 'string') : [];
        const createdAtVal = (() => {
            const v = (data as { createdAt?: unknown } | undefined)?.createdAt;
            if (v && typeof v === 'object' && 'toDate' in (v as Record<string, unknown>) && typeof (v as { toDate?: unknown }).toDate === 'function') {
                try { return (v as { toDate: () => Date }).toDate(); } catch { /* ignore */ }
            }
            return new Date();
        })();
        const body = JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: `NeuroSEO analysis for ${urls[0] || id}`,
            url: urls[0] || '',
            dateCreated: createdAtVal.toISOString(),
            variableMeasured: ['overallScore', 'topKeywords'],
            additionalProperty: [
                { '@type': 'PropertyValue', name: 'overallScore', value: (typeof data?.overallScore === 'number' ? data?.overallScore : 0) as number },
                { '@type': 'PropertyValue', name: 'provenance', value: (typeof data?.__provenance === 'string' ? data?.__provenance : 'live') as string },
                {
                    '@type': 'PropertyValue', name: 'topKeywords', value: (Array.isArray((data as { topKeywords?: unknown })?.topKeywords)
                        ? ((data as { topKeywords?: Array<{ keyword?: unknown }> }).topKeywords || [])
                            .map(k => (k && typeof k === 'object' && 'keyword' in k && typeof (k as { keyword?: unknown }).keyword === 'string') ? (k as { keyword: string }).keyword : '')
                            .filter(Boolean)
                            .join(', ')
                        : '')
                },
            ]
        }, null, 2);
        return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/ld+json' } });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
