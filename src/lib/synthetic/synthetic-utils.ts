// Synthetic data utilities: deterministic RNG + provenance helpers
// Deterministic seed ensures reproducible placeholder values, aiding tests & diff stability.
// Only for temporary UI simulation—replace with real NeuroSEOSuite / backend results over time.

type SeedRandomFactory = (seed?: string) => (() => number);
let seedrandomRef: SeedRandomFactory | null = null;
async function getSeedRandom(): Promise<SeedRandomFactory> {
    if (seedrandomRef) return seedrandomRef;
    const mod: unknown = await import('seedrandom');
    const resolved = (mod as { default?: unknown });
    seedrandomRef = (resolved && typeof resolved === 'object' && 'default' in resolved && typeof resolved.default === 'function'
        ? (resolved.default as SeedRandomFactory)
        : (mod as unknown as SeedRandomFactory));
    return seedrandomRef;
}

export type SyntheticProvenance = '__synthetic';

export function createDeterministicRng(seedParts: Array<string | number | undefined | null>) {
    const seed = seedParts.filter(Boolean).join('::');
    // Lazy async init; we return a closure that queues until seedrandom loaded
    let realRng: (() => number) | null = null;
    getSeedRandom().then(factory => { realRng = factory(seed || 'synthetic-default'); });
    return function rand() {
        if (realRng) return realRng();
        // Fallback deterministic hash while loading
        const h = seed.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
        return ((h % 1000) / 1000);
    };
}

export function tagSynthetic<T extends object>(obj: T): T & { __provenance: SyntheticProvenance } {
    return Object.assign(obj, { __provenance: '__synthetic' as const });
}

export const randomInt = (rng: () => number, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
export const randomFloat = (rng: () => number, min: number, max: number, precision = 2) => {
    const v = rng() * (max - min) + min;
    return Number(v.toFixed(precision));
};
