import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAF_ktwHXPw6gDkoolCI77XeB_NGHTmAFA",
  authDomain: "masartamayoz.firebaseapp.com",
  projectId: "masartamayoz",
  storageBucket: "masartamayoz.firebasestorage.app",
  messagingSenderId: "589955939618",
  appId: "1:589955939618:web:728ddeb7027b2becd1f97b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Force local persistence for reliability
setPersistence(auth, browserLocalPersistence).catch(console.error);

export const db = getFirestore(app);

// Critical connection test mandatory for AI Studio environment
async function testConnection() {
  try {
    // Only test if not on a known local/dev domain if needed, but here we just want it quiet
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silently fail if it's just a connectivity check
    console.warn('Firebase Check (Silent):', error);
  }
}

testConnection();
