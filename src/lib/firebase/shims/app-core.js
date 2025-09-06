// Runtime shim for '@firebase/app' to avoid missing internal package resolution in some environments.
// Re-export the public Firebase App API from 'firebase/app' and provide a no-op registerVersion.
// This is safe for dev/test; production builds should use real packages when available.
export * from 'firebase/app';
export const registerVersion = (..._args) => { };
