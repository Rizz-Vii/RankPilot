// Minimal Firestore mock covering used APIs in AuthContext and user-subscription-sync
export type DocumentReference = any;
export type Query = any;
export const doc = (..._args: any[]) => ({ __type: "doc" });
export const collection = (..._args: any[]) => ({ __type: "collection" });
export const getDoc = async (_ref: any) => ({
  exists: () => false,
  data: () => ({}),
});
export const getDocs = async (_q: any) => ({ docs: [] });
export const query = (..._args: any[]) => ({ __type: "query" });
export const orderBy = (..._args: any[]) => ({ __type: "orderby" });
export const limit = (..._args: any[]) => ({ __type: "limit" });
export const serverTimestamp = () => new Date();
