import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminDb: Firestore;

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // Use service account credentials from environment variable
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
      try {
        const credentials = JSON.parse(serviceAccount);
        app = initializeApp({
          credential: cert(credentials),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } catch {
        // Fallback to application default credentials
        app = initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    } else {
      // Use application default credentials (for local development or Cloud Run)
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } else {
    app = getApps()[0];
  }

  adminDb = getFirestore(app);
  return adminDb;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    return initializeFirebaseAdmin();
  }
  return adminDb;
}
