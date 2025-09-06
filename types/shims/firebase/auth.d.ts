export interface User { uid: string; email?: string | null;[key: string]: any }
export interface Auth { currentUser: User | null; onAuthStateChanged(cb: (u: User | null) => void): () => void }
export function getAuth(app?: any): Auth;
export function signOut(auth?: Auth): Promise<void>;
export class GoogleAuthProvider { setCustomParameters(params: Record<string, unknown>): void }
export class GithubAuthProvider { }
export class EmailAuthProvider { static credential(email: string, password: string): any }
export function signInWithPopup(auth: Auth, provider: any): Promise<{ user: User }>;
export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<{ user: User }>;
export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<{ user: User }>;
export function updateEmail(user: User, newEmail: string): Promise<void>;
export function updatePassword(user: User, newPassword: string): Promise<void>;
export function reauthenticateWithCredential(user: User, credential: any): Promise<void>;
