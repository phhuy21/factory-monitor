/**
 * ================================================================
 * Firebase Configuration — Khởi tạo Firebase App
 * ================================================================
 *
 * Sử dụng Firebase JS SDK (modular v10) — hoạt động với Expo Go
 * không cần native build.
 *
 * Config được đọc từ biến môi trường EXPO_PUBLIC_FIREBASE_*.
 * Xem file .env.example ở thư mục Tuan-2.
 */

import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Firebase Config ────────────────────────────────────────────

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length > 0) {
  throw new Error(
    `[Firebase] Thiếu cấu hình: ${missingConfig.join(', ')}. ` +
    'Hãy sao chép .env.example thành .env và điền các giá trị Firebase.'
  );
}

// ─── Initialize Firebase ────────────────────────────────────────

// Tránh khởi tạo trùng khi hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth với persistence qua AsyncStorage (giữ đăng nhập khi tắt app)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore database
const db = getFirestore(app);

export { app, auth, db };
export default app;
