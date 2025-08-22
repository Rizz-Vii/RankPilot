// Test-only error helpers to avoid pervasive `any` usage in catch clauses.
export function errorMessage(err: unknown): string {
    if (err && typeof err === 'object') {
        const maybe = err as { message?: unknown };
        if (typeof maybe.message === 'string') return maybe.message;
    }
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

export async function withErrorLog<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
    try {
        return await fn();
    } catch (e) {
        console.log(`${label}: ${errorMessage(e)}`);
        return undefined;
    }
}
