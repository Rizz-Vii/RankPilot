import { recordPredictiveForecastGenerated } from '../metrics/unified-metrics';
// KPI-01: In-memory predictive KPI module (advisory only)
// Deterministic forecasts using simple exponential smoothing on recent samples.

export interface ForecastInput {
    samples: number[]; // recent metric samples (e.g., p95 latencies)
    alpha?: number; // smoothing factor (0..1], default 0.3
}

export interface ForecastResult {
    forecast: number | null;
    horizon: number; // steps ahead (fixed 1)
    method: 'exp-smoothing';
    advisory: true;
}

export function forecastNext({ samples, alpha = 0.3 }: ForecastInput): ForecastResult {
    try { recordPredictiveForecastGenerated(1); } catch { /* optional */ }
    if (!Array.isArray(samples) || samples.length === 0) return { forecast: null, horizon: 1, method: 'exp-smoothing', advisory: true };
    // Bound alpha to (0,1]
    const a = Math.max(0.01, Math.min(1, alpha));
    let s = samples[0];
    for (let i = 1; i < samples.length; i++) {
        const x = samples[i];
        s = a * x + (1 - a) * s;
    }
    // Round to integer ms-ish value for stability
    const forecast = Math.round(s);
    return { forecast, horizon: 1, method: 'exp-smoothing', advisory: true };
}
