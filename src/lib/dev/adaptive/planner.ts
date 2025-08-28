import { getOutcomeStats } from './feedback-store';

export interface PlannerHints {
    acceptanceRate: number; // 0..1
    total: number; // sample size in window
    confidence: 'low' | 'med' | 'high';
    score: number; // 0..100 scaled acceptance
    suggestion?: string;
}

export function computePlannerHints(windowMs = 7 * 24 * 3600 * 1000): PlannerHints {
    const { rateAccepted, total } = getOutcomeStats(windowMs);
    // simple confidence heuristic based on sample size
    const confidence = total >= 50 ? 'high' : total >= 10 ? 'med' : 'low';
    const score = Math.round(rateAccepted * 100);
    let suggestion: string | undefined;
    if (confidence === 'low') suggestion = 'collect more feedback to improve confidence';
    else if (score < 50) suggestion = 'prioritize fixes for rejected patches';
    else if (score < 80) suggestion = 'continue iterative improvements';
    return { acceptanceRate: rateAccepted, total, confidence, score, suggestion };
}
