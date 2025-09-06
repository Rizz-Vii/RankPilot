export interface FirebaseApp { name?: string }
export function getApp(name?: string): FirebaseApp;
export function getApps(): FirebaseApp[];
export function initializeApp(config: Record<string, any>, name?: string): FirebaseApp;
export class FirebaseError extends Error {
    code: string;
    customData?: Record<string, unknown>;
    constructor(code: string, message?: string);
}
