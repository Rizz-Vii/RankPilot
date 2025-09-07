// Shared lightweight Next-like Response mock for unit tests.
class MockHeaders {
  constructor(initial) {
    this._m = new Map();
    if (initial) Object.entries(initial).forEach(([k, v]) => this._m.set(k, v));
  }
  get(k) {
    return this._m.get(k);
  }
  set(k, v) {
    this._m.set(k, String(v));
  }
}
function createJsonResponse(body, init) {
  const headers = new MockHeaders(init && init.headers);
  return {
    status: (init && init.status) || 200,
    headers,
    body,
    json: async () => body,
  };
}
module.exports = { createJsonResponse, MockHeaders };
