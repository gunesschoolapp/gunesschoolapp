import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAZxq4tCB_G5zsbD6_5l9FcNvSANlL23Ek",
  authDomain: "gunes-english.firebaseapp.com",
  projectId: "gunes-english",
  storageBucket: "gunes-english.firebasestorage.app",
  messagingSenderId: "438062176512",
  appId: "1:438062176512:web:448fe4789ae1f4c7c9bbe5",
  measurementId: "G-8B4WXSDT18"
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);
export default firebaseApp;
