/**
 * Build-safe Firebase configuration
 * Prevents Firebase initialization errors during static generation
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Build-safe Firebase initialization
export function initializeFirebaseSafe() {
    if (typeof window === 'undefined') {
        // Server-side: return mock objects for build
        return {
            app: null,
            auth: null,
            db: null
        };
    }

    try {
        if (getApps().length === 0) {
            const firebaseConfig = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rankpilot-h3jpc',
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:825491004370:web:b8b8b8b8b8b8b8b8b8b8'
            };

            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }

        auth = getAuth(app);
        db = getFirestore(app);

        return { app, auth, db };
    } catch (_error) {
        console.warn('[Firebase] Initialization failed, using mock objects:', _error);
        return {
            app: null,
            auth: null,
            db: null
        };
    }
}

// Export singleton instances
const { app: firebaseApp, auth: firebaseAuth, db: firebaseDb } = initializeFirebaseSafe();

export { firebaseApp, firebaseAuth, firebaseDb };
export default { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
