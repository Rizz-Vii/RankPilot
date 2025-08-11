// Synthetic data utilities: deterministic RNG + provenance helpers
// Deterministic seed ensures reproducible placeholder values, aiding tests & diff stability.
// Only for temporary UI simulation—replace with real NeuroSEOSuite / backend results over time.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const seedrandom: any = require('seedrandom');

export type SyntheticProvenance = '__synthetic';

export function createDeterministicRng(seedParts: Array<string | number | undefined | null>) {
    const seed = seedParts.filter(Boolean).join('::');
    const rng = seedrandom(seed || 'synthetic-default');
    return function rand() {
        return rng(); // 0 <= n < 1
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
