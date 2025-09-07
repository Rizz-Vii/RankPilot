// Minimal noop shim for Firebase App Check to avoid bundling the real module in dev/test
// Exports the surface used by firebase/* re-exports without side effects.
export function initializeAppCheck() {
  return {};
}
export function ReCaptchaV3Provider() {
  return {};
}
export function getToken() {
  return Promise.resolve({ token: "" });
}
export function onTokenChanged() {
  return () => {};
}
export default {};
