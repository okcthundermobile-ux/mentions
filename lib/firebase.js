import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyAuXkTn8CZTY-dllesI2rJa55P4g1K4XA4',
  authDomain: 'thunder-mentions.firebaseapp.com',
  projectId: 'thunder-mentions',
  storageBucket: 'thunder-mentions.firebasestorage.app',
  messagingSenderId: '219363901403',
  appId: '1:219363901403:web:aea89791a7922ef4a5b1fe',
  measurementId: 'G-7MNLG1XN8L',
};

export const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

// Analytics is browser-only; resolves to null during SSR.
export const analyticsPromise =
  typeof window !== 'undefined'
    ? isSupported().then((ok) => (ok ? getAnalytics(firebaseApp) : null))
    : Promise.resolve(null);
