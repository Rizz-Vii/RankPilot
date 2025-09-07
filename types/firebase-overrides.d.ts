// Ambient module overrides to make Firebase packages type-check under Bundler resolution

declare module "firebase/app" {
  export interface FirebaseApp {
    name?: string;
  }
  export function getApp(name?: string): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function initializeApp(
    config: Record<string, any>,
    name?: string
  ): FirebaseApp;
  export class FirebaseError extends Error {
    code: string;
    constructor(code: string, message?: string);
  }
  const _default: any;
  export default _default;
}

declare module "firebase/firestore" {
  export type DocumentData = any;
  export interface DocumentSnapshot<T = DocumentData> {
    id: string;
    data(): T;
    exists(): boolean;
  }
  export interface QuerySnapshot<T = DocumentData> {
    docs: Array<DocumentSnapshot<T>>;
    size: number;
    empty: boolean;
    forEach(cb: (doc: DocumentSnapshot<T>) => void): void;
  }
  export type Unsubscribe = () => void;
  export interface QueryConstraint {
    readonly type?: string;
  }
  export interface CollectionReference<T = DocumentData> {
    readonly path?: string;
  }
  export interface DocumentReference<T = DocumentData> {
    readonly path?: string;
    id: string;
  }
  export interface Query<T = DocumentData> {}

  export interface Firestore {}
  export interface FirestoreSettings {
    ignoreUndefinedProperties?: boolean;
    experimentalForceLongPolling?: boolean;
    experimentalAutoDetectLongPolling?: boolean;
    experimentalLongPollingOptions?: { timeoutSeconds: number };
    useFetchStreams?: boolean;
    [key: string]: any;
  }

  export function initializeFirestore(
    app: any,
    settings?: FirestoreSettings
  ): Firestore;
  export function connectFirestoreEmulator(
    db: Firestore,
    host: string,
    port: number
  ): void;
  export function terminate(db: Firestore): Promise<void>;
  export function getFirestore(app?: any): Firestore;

  export function collection<T = DocumentData>(
    db: Firestore,
    path: string,
    ...pathSegments: string[]
  ): CollectionReference<T>;
  export function doc<T = DocumentData>(
    db: Firestore,
    path: string,
    ...pathSegments: string[]
  ): DocumentReference<T>;
  export function documentId(): any;

  export function getDoc<T = DocumentData>(
    ref: DocumentReference<T>
  ): Promise<DocumentSnapshot<T>>;
  export function getDocs<T = DocumentData>(
    q: Query | any
  ): Promise<QuerySnapshot<T>>;
  export function query<T = DocumentData>(
    col: CollectionReference<T>,
    ...constraints: QueryConstraint[]
  ): Query<T>;
  export function where(
    fieldPath: string,
    opStr: any,
    value: any
  ): QueryConstraint;
  export function orderBy(
    fieldPath: string,
    directionStr?: "asc" | "desc"
  ): QueryConstraint;
  export function limit(n: number): QueryConstraint;
  export function startAfter(...fieldValues: any[]): QueryConstraint;
  export function getCountFromServer(q: Query | any): Promise<any>;

  export function addDoc<T = DocumentData>(
    col: CollectionReference<T>,
    data: T
  ): Promise<DocumentReference<T>>;
  export function setDoc<T = DocumentData>(
    ref: DocumentReference<T>,
    data: Partial<T>,
    options?: any
  ): Promise<void>;
  export function updateDoc<T = DocumentData>(
    ref: DocumentReference<T>,
    data: Partial<T>
  ): Promise<void>;
  export function deleteDoc<T = DocumentData>(
    ref: DocumentReference<T>
  ): Promise<void>;
  // Overloads: DocumentReference first for better inference
  // Prefer DocumentReference overload first
  export function onSnapshot<T = DocumentData>(
    ref: DocumentReference<T>,
    onNext: (snap: DocumentSnapshot<T>) => void,
    onError?: (err: any) => void
  ): Unsubscribe;
  export function onSnapshot<T = DocumentData>(
    q: Query | any,
    onNext: (snap: QuerySnapshot<T>) => void,
    onError?: (err: any) => void
  ): Unsubscribe;

  export type Timestamp = { toDate?: () => Date } & any;
  export const Timestamp: { now(): any; fromDate(d: Date): Timestamp };
  export function serverTimestamp(): any;
  export function increment(n: number): any;

  const _default: any;
  export default _default;
}

declare module "firebase/functions" {
  export interface Functions {}
  export function getFunctions(app?: any, region?: string): Functions;
  export function connectFunctionsEmulator(
    functions: Functions,
    host: string,
    port: number
  ): void;
  export function httpsCallable<Req = any, Res = any>(
    functions: Functions,
    name: string
  ): (data: Req) => Promise<{ data: Res }>;
  const _default: any;
  export default _default;
}

declare module "firebase/auth" {
  export interface User {
    uid: string;
    email?: string | null;
    [key: string]: any;
  }
  export interface Auth {
    currentUser: User | null;
    onAuthStateChanged(cb: (u: User | null) => void): () => void;
  }
  export function getAuth(app?: any): Auth;
  export function signOut(auth?: Auth): Promise<void>;
  export class GoogleAuthProvider {
    setCustomParameters(params: Record<string, unknown>): void;
  }
  export class GithubAuthProvider {}
  export class EmailAuthProvider {
    static credential(email: string, password: string): any;
  }
  export function signInWithPopup(
    auth: Auth,
    provider: any
  ): Promise<{ user: User }>;
  export function signInWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<{ user: User }>;
  export function createUserWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string
  ): Promise<{ user: User }>;
  export function updateEmail(user: User, newEmail: string): Promise<void>;
  export function updatePassword(
    user: User,
    newPassword: string
  ): Promise<void>;
  export function reauthenticateWithCredential(
    user: User,
    credential: any
  ): Promise<void>;
  const _default: any;
  export default _default;
}

declare module "firebase/storage" {
  export interface FirebaseStorage {}
  export function getStorage(app?: any): FirebaseStorage;
  export function ref(storage: FirebaseStorage, path: string): any;
  export function uploadBytes(
    r: any,
    data: Blob | ArrayBuffer | Uint8Array
  ): Promise<any>;
  export function updateMetadata(r: any, metadata: any): Promise<any>;
  export function getDownloadURL(r: any): Promise<string>;
  const _default: any;
  export default _default;
}

declare module "firebase/analytics" {
  export interface Analytics {}
  export function isSupported(): Promise<boolean>;
  export function getAnalytics(app?: any): Analytics;
  export function logEvent(
    analytics: Analytics,
    eventName: string,
    params?: Record<string, unknown>
  ): void;
  export function setUserProperties(
    analytics: Analytics,
    properties: Record<string, unknown>
  ): void;
  const _default: any;
  export default _default;
}
