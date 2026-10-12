// Cấu hình Firebase cho production (Firebase Auth + FCM).
// Xem hướng dẫn đầy đủ: docs/FIREBASE_SETUP.md
// API key lấy từ google-services.json (đã commit trong repo) —
// chìa khóa này là public key của client app, được phép nằm trong app.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCfkOYHL-1KTV8uvoFPp3Q5es0a2CWu68Y',
  authDomain: 'eduteach-2ace8.firebaseapp.com',
  projectId: 'eduteach-2ace8',
};

// Bật khi đã: (1) bật Email/Password trong Firebase Console,
// (2) deploy Edge Function firebase-verify, (3) chạy SQL 05 (cột users.firebase_uid).
export const FIREBASE_AUTH_ENABLED = false;
