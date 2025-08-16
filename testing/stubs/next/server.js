// Minimal next/server stub for isolated route contract tests
class HeadersMock {
  constructor(init={}){ this._map = new Map(Object.entries(init)); }
  get(k){ return this._map.get(k.toLowerCase()) || this._map.get(k); }
  set(k,v){ this._map.set(k.toLowerCase(), v); }
}
exports.NextResponse = class NextResponse { static json(body, init){ const headers = new HeadersMock(init && init.headers || {}); return { status: (init && init.status) || 200, body, headers, json: async()=>body }; } };
exports.NextRequest = class NextRequest { constructor(url, opts={}){ this.url = url; this.headers = { get: (k)=> (opts.headers && (opts.headers[k] || opts.headers[k.toLowerCase()])) }; } };
