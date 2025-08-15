// Minimal next/server stub for unit tests without Next runtime
exports.NextResponse = class NextResponse {
  constructor(body, init){ this._body = body; this.status = init?.status||200; this.headers = new Map(Object.entries((init&&init.headers)||{})); }
  static json(body, init){ return new exports.NextResponse(body, init); }
  async json(){ return this._body; }
  headers = { set: (k,v)=>{ this.headers.set(k.toLowerCase(), String(v)); }, get: (k)=> this.headers.get(k.toLowerCase()) };
};
exports.NextRequest = class NextRequest { constructor(url, init){ this.url = url; this.headers = new Map(Object.entries((init&&init.headers)||{})); } };
