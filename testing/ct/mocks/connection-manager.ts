// Minimal mock of firebase connection-manager for CT
export const getClientApp = () => ({}) as any;
export const getClientDb = () => ({}) as any;
export const resetFirestoreConnection = async () => { };
export const validateConnection = async () => true;
export const connectionManager = {
    isConnected: () => true,
    getAppInstance: () => ({} as any),
    getDatabase: () => ({} as any),
};
