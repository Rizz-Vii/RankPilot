export interface FirebaseStorage { }
export function getStorage(app?: any): FirebaseStorage;
export function ref(storage: FirebaseStorage, path: string): any;
export function uploadBytes(r: any, data: Blob | ArrayBuffer | Uint8Array): Promise<any>;
export function getDownloadURL(r: any): Promise<string>;
