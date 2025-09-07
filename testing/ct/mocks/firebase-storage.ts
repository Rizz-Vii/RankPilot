export const getStorage = () => ({
  /* mock storage */
});
export type FirebaseStorage = Record<string, unknown>;
export const ref = (..._args: any[]) => ({ path: "mock" });
export const uploadBytes = async (..._args: any[]) => ({
  ref: { fullPath: "mock/path" },
});
export const getDownloadURL = async (..._args: any[]) =>
  "https://example.com/mock-upload.jpg";
