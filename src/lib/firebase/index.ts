// Unified Firebase client exports leveraging connection-manager singleton to avoid duplicate init & logs
import { app, db } from '@/lib/firebase/connection-manager';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

export const auth = getAuth(app);
export { app, db };

// Functions (explicit region per project standard)
export const functions = getFunctions(app, 'australia-southeast2');

// Storage
export const storage = getStorage(app);

// Functions emulator (optional)
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === 'true') {
  try { connectFunctionsEmulator(functions, 'localhost', 5001); } catch { /* already connected */ }
}

// Analytics (only prod + supported + measurementId provided via env)
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
  if (measurementId) {
    void isSupported().then(supported => {
      if (supported) {
        try { analyticsInstance = getAnalytics(app); } catch { analyticsInstance = null; }
      }
    });
  }
}
// Export with stable name; downstream should use guards before logging events.
export const analytics: Analytics | null = analyticsInstance;
