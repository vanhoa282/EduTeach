// Firebase Auth qua REST API (Identity Toolkit) — KHÔNG cần native module,
// chạy được cả Expo Go. Dùng cho bước chuyển production (giữ Supabase làm DB).
import { FIREBASE_CONFIG, FIREBASE_AUTH_ENABLED } from './firebaseConfig';
import { supabase } from './supabase';

const IDENTITY_URL = 'https://identitytoolkit.googleapis.com/v1';

export function isFirebaseAuthEnabled() {
  return FIREBASE_AUTH_ENABLED && !!FIREBASE_CONFIG.apiKey;
}

const ERROR_MAP = {
  EMAIL_NOT_FOUND: 'Email chưa đăng ký tài khoản.',
  INVALID_PASSWORD: 'Mật khẩu không đúng.',
  USER_DISABLED: 'Tài khoản đã bị khóa.',
  EMAIL_EXISTS: 'Email đã được đăng ký.',
  WEAK_PASSWORD: 'Mật khẩu phải có ít nhất 6 ký tự.',
  INVALID_EMAIL: 'Email không hợp lệ.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Đăng nhập sai quá nhiều lần. Thử lại sau.',
};

function mapError(raw) {
  const code = (raw || '').replace(' : ', ' ').split(' ')[0];
  return ERROR_MAP[code] || 'Lỗi Firebase: ' + (raw || 'không xác định');
}

async function identityCall(path, body) {
  if (!isFirebaseAuthEnabled()) {
    throw new Error('Firebase Auth chưa được bật (xem lib/firebaseConfig.js + docs/FIREBASE_SETUP.md)');
  }

  const res = await fetch(IDENTITY_URL + path + '?key=' + FIREBASE_CONFIG.apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(mapError(data?.error?.message));
  }
  return data;
}

// Đăng nhập → { idToken, localId, email }
export async function firebaseSignIn(email, password) {
  const data = await identityCall('/accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });
  return {
    idToken: data.idToken,
    localId: data.localId,
    email: data.email,
  };
}

// Đăng ký → { idToken, localId, email }
export async function firebaseSignUp(email, password) {
  const data = await identityCall('/accounts:signUp', {
    email,
    password,
    returnSecureToken: true,
  });
  return {
    idToken: data.idToken,
    localId: data.localId,
    email: data.email,
  };
}

// Xác minh ID token qua Edge Function firebase-verify (chống giả mạo token).
// Trả về { ok, uid, email } — dùng uid để map với users.firebase_uid.
export async function firebaseVerifyOnServer(idToken) {
  const { data, error } = await supabase.functions.invoke('firebase-verify', {
    body: { token: idToken },
  });

  if (error) {
    throw new Error('Không xác minh được phiên Firebase: ' + (error?.message || ''));
  }
  if (!data?.ok) {
    throw new Error(data?.message || 'Token Firebase không hợp lệ');
  }
  return { uid: data.uid, email: data.email };
}
