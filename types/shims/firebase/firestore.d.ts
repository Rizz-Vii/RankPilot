export type DocumentData = any;
export interface DocumentSnapshot<T = DocumentData> { id: string; data(): T; exists(): boolean }
export interface QuerySnapshot<T = DocumentData> {
    docs: Array<DocumentSnapshot<T>>;
    size: number;
    empty: boolean;
    forEach(cb: (doc: DocumentSnapshot<T>) => void): void;
}
export type Unsubscribe = () => void;
export interface QueryConstraint { readonly type?: string }
export interface CollectionReference<T = DocumentData> { readonly path?: string }
export interface DocumentReference<T = DocumentData> { readonly path?: string; id: string }

export interface Firestore { }
export interface FirestoreSettings {
    ignoreUndefinedProperties?: boolean;
    experimentalForceLongPolling?: boolean;
    experimentalAutoDetectLongPolling?: boolean;
    experimentalLongPollingOptions?: { timeoutSeconds: number };
    useFetchStreams?: boolean;
    [key: string]: any;
}

export function initializeFirestore(app: any, settings?: FirestoreSettings): Firestore;
export function connectFirestoreEmulator(db: Firestore, host: string, port: number): void;
export function terminate(db: Firestore): Promise<void>;
export function getFirestore(app?: any): Firestore;

export function collection<T = DocumentData>(db: Firestore, path: string, ...pathSegments: string[]): CollectionReference<T>;
export function doc<T = DocumentData>(db: Firestore, path: string, ...pathSegments: string[]): DocumentReference<T>;

export function getDoc<T = DocumentData>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
export interface Query<T = DocumentData> { }
export function getDocs<T = DocumentData>(q: Query<T> | any): Promise<QuerySnapshot<T>>;
export function query<T = DocumentData>(col: CollectionReference<T>, ...constraints: QueryConstraint[]): any;
export function where(fieldPath: string, opStr: any, value: any): QueryConstraint;
export function orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): QueryConstraint;
export function limit(n: number): QueryConstraint;
export function startAfter(...fieldValues: any[]): QueryConstraint;
export function documentId(): any;
export function getCountFromServer(q: Query | any): Promise<any>;
export function deleteDoc<T = DocumentData>(ref: DocumentReference<T>): Promise<void>;

export function addDoc<T = DocumentData>(col: CollectionReference<T>, data: T): Promise<DocumentReference<T>>;
export function setDoc<T = DocumentData>(ref: DocumentReference<T>, data: Partial<T>, options?: any): Promise<void>;
export function updateDoc<T = DocumentData>(ref: DocumentReference<T>, data: Partial<T>): Promise<void>;
// Prefer DocumentReference overload first to avoid Query matching it
export function onSnapshot<T = DocumentData>(ref: DocumentReference<T>, onNext: (snap: DocumentSnapshot<T>) => void, onError?: (err: any) => void): Unsubscribe;
export function onSnapshot<T = DocumentData>(q: Query<T> | any, onNext: (snap: QuerySnapshot<T>) => void, onError?: (err: any) => void): Unsubscribe;

export type Timestamp = { toDate?: () => Date } & any;
export const Timestamp: { now(): any; fromDate(d: Date): Timestamp };
export function serverTimestamp(): any;
export function increment(n: number): any;
