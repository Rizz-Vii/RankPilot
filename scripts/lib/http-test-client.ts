import http from 'http';

export interface SimpleResp { status: number; json: any }
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function httpReq(method: Method, path: string, body?: any, token?: string): Promise<SimpleResp> {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : undefined;
        const headers: Record<string, string | number> = { 'Content-Type': 'application/json' };
        if (data) headers['Content-Length'] = Buffer.byteLength(data);
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const req = http.request({ hostname: 'localhost', port: Number(process.env.PORT) || 3000, path, method, headers }, res => {
            let buf = ''; res.on('data', c => buf += c); res.on('end', () => {
                try { resolve({ status: res.statusCode || 0, json: buf ? JSON.parse(buf) : {} }); } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

export function assertEq(actual: any, expected: any, msg: string) {
    if (actual !== expected) { console.error(`ASSERT EQ FAIL: ${msg} (expected=${expected} got=${actual})`); process.exitCode = 1; }
}
export function assert(cond: any, msg: string) { if (!cond) { console.error(`ASSERT FAIL: ${msg}`); process.exitCode = 1; } }
