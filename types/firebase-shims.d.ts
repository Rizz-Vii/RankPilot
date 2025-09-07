// TypeScript shims to satisfy resolution for optional Firebase modules during dev/test.

declare module "@firebase/app-check" {
  export function initializeAppCheck(...args: any[]): any;
  export function ReCaptchaV3Provider(...args: any[]): any;
  export function getToken(...args: any[]): Promise<{ token: string }>;
  export function onTokenChanged(...args: any[]): () => void;
  const _default: any;
  export default _default;
}

declare module "firebase/app-check" {
  export * from "@firebase/app-check";
}

// Generic shim for any '@firebase/*' deep import which might be re-exported by 'firebase/*'
declare module "@firebase/*" {
  const anyExport: any;
  export = anyExport;
}
