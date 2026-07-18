import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export { firebaseConfig };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Force local persistence for reliability
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Use initializeFirestore to enable long polling which is more robust in some proxy/VPN environments
console.info('Initializing Firestore for project:', firebaseConfig.projectId);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' ? firebaseConfig.firestoreDatabaseId : undefined);

// Enable offline persistence for robust reliability across temporary network dropouts
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db)
    .then(() => {
      console.info('Firestore offline multi-tab persistence enabled successfully.');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore multi-tab persistence failed-precondition: multiple tabs open.');
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore multi-tab persistence unimplemented in this browser. Falling back to single-tab...');
        enableIndexedDbPersistence(db)
          .then(() => {
            console.info('Firestore offline single-tab persistence enabled successfully.');
          })
          .catch((e) => {
            console.warn('Firestore single-tab persistence failed:', e);
          });
      } else {
        console.warn('Firestore multi-tab persistence failed to enable:', err);
      }
    });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Critical connection test mandatory for AI Studio environment
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    console.warn('Firebase Check (Silent):', error);
  }
}

testConnection();
