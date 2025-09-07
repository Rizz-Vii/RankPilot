export type Auth = Record<string, unknown>;
export const getAuth = () => ({}) as Auth;
export const signInWithEmailAndPassword = async () => ({
  user: { uid: "test" },
});
export const signInWithPopup = async () => ({ user: { uid: "test" } });
export const createUserWithEmailAndPassword = async () => ({
  user: { uid: "test" },
});
export class GoogleAuthProvider {}
export class GithubAuthProvider {}
