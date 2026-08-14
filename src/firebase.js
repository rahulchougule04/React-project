// Import Firebase SDK v10+ modular services
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// Values read from environment variables (VITE_FIREBASE_*) with default fallback placeholders
const firebaseConfig = {
    apiKey: "AIzaSyBIlsb-De_ahqp0RBeCBucCeFwIwOvolaw",
    authDomain: "payment-f9b39.firebaseapp.com",
    projectId: "payment-f9b39",
    storageBucket: "payment-f9b39.firebasestorage.app",
    messagingSenderId: "228284158987",
    appId: "1:228284158987:web:cb49d99cd3458197e9e30e",
    measurementId: "G-BZBH64RLXW"
  };

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
