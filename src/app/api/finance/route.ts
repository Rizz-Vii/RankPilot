import { getFinanceMetrics } from '@/lib/finance/metrics'
// Auth options module not present; fallback to open endpoint (non-sensitive mock metrics).

export async function GET(req: Request) {
    // TODO: integrate real auth when finance metrics become sensitive

    const { data, headers } = await getFinanceMetrics(req)
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    })
}