
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp   = initializeApp(firebaseConfig);
export const db            = getFirestore(firebaseApp);   // Firestore Database
export const auth          = getAuth(firebaseApp);        // Authentication
export const storage       = getStorage(firebaseApp);     // Storage (file upload)
export const googleProvider = new GoogleAuthProvider();   // Google Sign-in (basic profile)

export const createDriveProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.setCustomParameters({
    prompt: 'consent',
    include_granted_scopes: 'true',
  });
  return provider;
};
