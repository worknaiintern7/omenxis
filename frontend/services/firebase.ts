import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',           // Get from Firebase Console → Project Settings → General → Web API Key
  authDomain: 'chessapplication-14ced.firebaseapp.com',
  projectId: 'chessapplication-14ced',
  storageBucket: 'chessapplication-14ced.appspot.com',
  messagingSenderId: '1038790065894',
  appId: '1:1038790065894:android:62d6924bcdd23f60d2c527',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

// Messaging only supported on web/browser environments
export const getMessagingInstance = async () => {
  const supported = await isSupported();
  if (supported) return getMessaging(app);
  return null;
};

export default app;
