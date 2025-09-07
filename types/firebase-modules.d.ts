// Minimal typings for Firebase modules to satisfy TS in dev/test environments
// without pulling full @firebase/* type graphs. At runtime, real modules are used.

declare module "firebase/app" {
  export interface FirebaseApp {
    name?: string;
  }
  export function getApp(): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function initializeApp(config: Record<string, any>): FirebaseApp;
}

declare module "firebase/firestore" {
  // Light-weight Firestore surface sufficient for type-checking in dev/test
  export type DocumentData = any;
  export interface DocumentSnapshot<T = DocumentData> {
    id: string;
    data(): T;
  }
  export interface QuerySnapshot<T = DocumentData> {
    docs: Array<DocumentSnapshot<T>>;
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
  }

  export interface Firestore {}
  export interface FirestoreSettings {
    ignoreUndefinedProperties?: boolean;
    experimentalForceLongPolling?: boolean;
    experimentalAutoDetectLongPolling?: boolean;
    experimentalLongPollingOptions?: { timeoutSeconds: number };
    useFetchStreams?: boolean;
    [key: string]: any;
  }

  // Initialization and connectivity
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

  // Data model helpers
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

  // Reads
  export function getDoc<T = DocumentData>(
    ref: DocumentReference<T>
  ): Promise<DocumentSnapshot<T>>;
  export function getDocs<T = DocumentData>(q: any): Promise<QuerySnapshot<T>>;
  export function query<T = DocumentData>(
    col: CollectionReference<T>,
    ...constraints: QueryConstraint[]
  ): any;
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

  // Writes / realtime
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
  export function onSnapshot<T = DocumentData>(
    q: any,
    onNext: (snap: QuerySnapshot<T>) => void,
    onError?: (err: any) => void
  ): Unsubscribe;

  // Timestamps
  export const Timestamp: { now(): any; fromDate(d: Date): any };
  export function serverTimestamp(): any;
}

declare module "firebase/functions" {
  export function httpsCallable<Req = any, Res = any>(
    functions: any,
    name: string
  ): (data: Req) => Promise<{ data: Res }>;
}

declare module "firebase/auth" {
  export interface User {
    uid: string;
    [key: string]: any;
  }
}
