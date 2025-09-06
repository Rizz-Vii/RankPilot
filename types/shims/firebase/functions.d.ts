export interface Functions { }
export function getFunctions(app?: any, region?: string): Functions;
export function connectFunctionsEmulator(functions: Functions, host: string, port: number): void;
export function httpsCallable<Req = any, Res = any>(functions: Functions, name: string): (data: Req) => Promise<{ data: Res }>;
