import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAY6vVp5pTXpRI2SgrRoNlj0wIlfowfn9E",
  authDomain: "test-bd849.firebaseapp.com",
  projectId: "test-bd849",
  storageBucket: "test-bd849.appspot.com",  // ← "firebasestorage.app" ではなく正確に
  messagingSenderId: "996071861565",
  appId: "1:996071861565:web:d4a0152389ceae3713a954",
  measurementId: "G-035MCNG398"
};

// 初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
