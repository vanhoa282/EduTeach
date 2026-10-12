# Firebase Auth / FCM — Hướng dẫn cấu hình production

EduTeach đang dùng: Supabase (DB) + Edge Function auth-login (auth nội bộ) +
expo-notifications (push qua Expo Push Service). File này hướng dẫn chuyển
sang **Firebase Auth** (xác thực production) và **FCM** khi cần.

## A. Firebase Auth (giữ Supabase làm DB)

### 1. Bật dịch vụ
1. Mở https://console.firebase.google.com → chọn project **eduteach-2ace8**
2. Build → **Authentication** → **Get started** → Sign-in method → bật **Email/Password**
3. Project settings → General → ghi lại **Web API Key**
   (repo đã có key Android trong `google-services.json`)

### 2. Cấu hình app
Mở `lib/firebaseConfig.js`:
- `apiKey`: điền Web API Key (hoặc giữ key Android nếu chỉ dùng app mobile)
- `FIREBASE_AUTH_ENABLED = true`

Module `lib/firebaseAuth.js` đã có sẵn:
- `firebaseSignIn(email, password)` / `firebaseSignUp(email, password)`
  (REST Identity Toolkit — không cần native module, chạy cả Expo Go)
- `firebaseVerifyOnServer(idToken)` → xác minh qua Edge Function

### 3. Deploy Edge Function firebase-verify
1. Supabase Dashboard → **Edge Functions** → deploy function `firebase-verify`
   (code trong `supabase/functions/firebase-verify/index.ts` — tự verify RS256
   bằng Google JWKS, KHÔNG cần service account JSON)
2. JWT Verification: **OFF**
3. Env: `FIREBASE_PROJECT_ID=eduteach-2ace8`

### 4. SQL mapping Firebase UID ↔ user Supabase
Chạy `supabase/sql/05_harden_rls.sql` (đã kèm cột `users.firebase_uid` UNIQUE).
Luồng đề xuất khi login bằng Firebase:
1. App gọi `firebaseSignIn` → có `idToken` + `localId`
2. App gọi `firebaseVerifyOnServer(idToken)` → chắc chắn token thật
3. Edge Function / RPC tìm `users` theo `firebase_uid = localId` → trả phiên
   như auth-login hiện tại. (Tạo sẵn khi đăng ký: insert users với firebase_uid.)

> Khuyến nghị: chạy song song — giữ auth nội bộ làm fallback, bật
> `FIREBASE_AUTH_ENABLED` sau khi test thành công trên máy thật.

## B. FCM push notification

**Hiện tại app đã dùng `expo-notifications`** (Expo Push Service) — hoạt động
trên APK production, không cần thêm gì. Nếu muốn chuyển FCM thuần (batch
notification, topic...):

1. `npx expo install @react-native-firebase/app @react-native-firebase/messaging`
2. Thêm plugin vào `app.json`:
   ```json
   "plugins": [
     ["@react-native-firebase/app", { "android": { "googleServicesFile": "./google-services.json" } }],
     "@react-native-firebase/messaging"
   ]
   ```
3. Build development build mới (thay đổi native).
4. Server gửi qua FCM HTTP v1 API bằng service account (thêm secret vào Edge
   Function push-webhook, thay Expo Push API bằng FCM API).

> Lưu ý: nhắc buổi học 30 phút hiện dùng **local notification**
> (`lib/notifications.js → syncSessionReminders`) nên KHÔNG phụ thuộc FCM.

## C. google-services.json / GoogleService-Info.plist

- **Android**: `google-services.json` đã có ở thư mục gốc (package
  `com.vanhoa282.eduteach`). Không cần đổi trừ khi đổi package name.
- **iOS**:
  1. Firebase Console → Project settings → Add app → iOS (bundle ID
     `com.vanhoa282.eduteach`)
  2. Tải `GoogleService-Info.plist` đặt vào thư mục gốc repo
  3. `app.json` thêm:
     ```json
     "ios": { "googleServicesFile": "./GoogleService-Info.plist" }
     ```
  4. Rebuild.
