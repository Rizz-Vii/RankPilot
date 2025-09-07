// Minimal next/server stub for isolated route contract tests
class HeadersMock {
  constructor(init = {}) {
    this._map = new Map();
    for (const [k, v] of Object.entries(init))
      this._map.set(String(k).toLowerCase(), v);
  }
  get(k) {
    return this._map.get(String(k).toLowerCase()) || null;
  }
  set(k, v) {
    this._map.set(String(k).toLowerCase(), v);
  }
  has(k) {
    return this._map.has(String(k).toLowerCase());
  }
}
exports.NextResponse = class NextResponse {
  static json(body, init) {
    const headers = new HeadersMock((init && init.headers) || {});
    return {
      status: (init && init.status) || 200,
      body,
      headers,
      json: async () => body,
    };
  }
  static next(init = {}) {
    const headers = new HeadersMock((init && init.headers) || {});
    return { status: 200, headers };
  }
};
exports.NextRequest = class NextRequest {
  constructor(url, opts = {}) {
    this.url = url;
    const hdrs = new HeadersMock((opts && opts.headers) || {});
    this.headers = { get: (k) => hdrs.get(k), has: (k) => hdrs.has(k) };
    this.nextUrl = { pathname: new URL(url, "http://localhost").pathname };
  }
};
