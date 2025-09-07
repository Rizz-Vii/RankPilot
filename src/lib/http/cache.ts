/** Small helpers to standardize cache-control for API responses. */
export function noStoreHeaders(): Record<string, string> {
  return { "Cache-Control": "no-store" };
}
export function sMaxage(
  seconds: number,
  staleWhileRevalidate = 60
): Record<string, string> {
  const smax = Math.max(0, Math.floor(seconds));
  const swr = Math.max(0, Math.floor(staleWhileRevalidate));
  return {
    "Cache-Control": `public, s-maxage=${smax}, stale-while-revalidate=${swr}`,
  };
}
export function privateMaxAge(seconds: number): Record<string, string> {
  const max = Math.max(0, Math.floor(seconds));
  return { "Cache-Control": `private, max-age=${max}` };
}
