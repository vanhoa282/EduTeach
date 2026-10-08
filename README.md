# EduTeach - App Gia Su

## TONG QUAN
App mobile ket noi hoc sinh va gia su. 3 role: student, tutor, admin.
Phuc vu sinh vien su pham va cac thay co co lich ranh.
Tich hop AI tro ly hoc tap (DeepSeek V4 Pro/Flash).

## TECH STACK
- React Native + Expo SDK 57
- Supabase (Postgres + Realtime + Storage + Edge Functions)
- @expo/vector-icons (Ionicons)
- react-native-safe-area-context
- AsyncStorage (persist session + AI chat local)
- bcryptjs + expo-crypto (hash password)
- expo-image-picker + expo-file-system/legacy + base64-arraybuffer (upload anh)
- expo-clipboard (copy code block)
- EAS Build cho APK

## SUPABASE
- URL: https://jrkqfalwcleetppqtcvb.supabase.co
- anon key: sb_publishable_dvrXZVCmpFRnrAjMwTA53g_31nvYNCT
- EAS projectId: dc90e3c4-6404-499c-9861-61f3b266d8b2
- Owner: vanhoa282
- Storage bucket: bills (public)

## EDGE FUNCTIONS
1. chat-ai - AI tro ly (DeepSeek V4 Pro/Flash)
2. admin-esms-config - Admin config eSMS/DeepSeek
3. send-otp - Gui OTP qua eSMS
4. verify-otp - Xac minh OTP + tao user

Tat ca deu JWT Verification OFF (dung custom auth trong code).
Deploy qua Supabase Dashboard -> Edge Functions -> Deploy a new function.

## TAI KHOAN TEST
- Admin: 0325272884 (Ho Van Hoa)
- Gia su: 0901111111, 0902222222, 0903333333 - pass 123456
- Hoc sinh: 0904444444 - pass 123456

## THANH TOAN
- Ngan hang: ACB - 25317541 - HO VAN HOA
- Ma don: EDT + 6 so random
- Countdown: 30 phut
- Upload bill that len Supabase Storage
- Admin duyet tu bill

## AI TRO LY HOC TAP

### Tinh nang
- Nut tron noi (keo duoc khap man hinh) goc phai duoi
- Box chat kieu Zalo
- Tra loi: giai bai, huong dan app, viet code, tim gia su
- Markdown: **bold** highlight tim, bullet, heading
- Code block: khung den + nut Copy (expo-clipboard)
- Latex -> Unicode tu dong (√, ², Δ, π, ∑, ∫...)
- Table -> Bullet converter (AI khong duoc dung bang markdown)

### Phan cap model
- Flash (chua co khoa hoc): DeepSeek V4-Flash, 20 cau/ngay
- Pro (co >=1 khoa hoc, ca HS va GS): DeepSeek V4-Pro, 100 cau/ngay
- Rate limit admin set duoc

### Bao mat AI
- KHONG tiet lo: password, so du vi, SDT, CCCD
- Chi tra loi: danh sach GS (ten, mon, gia), huong dan app, giai bai
- Cau hoi bao mat -> "Lien he admin qua muc Ho tro"

### Admin config
- Vao Admin Profile -> Cau hinh DeepSeek AI
- Nhap mat khau admin -> Nhap API Key -> Luu
- Config luu trong bang admin_configs (RLS block client)

### API Key DeepSeek
- Dang ky: platform.deepseek.com
- Free $1 credit khi dang ky moi
- Top up it nhat $5 (~125k VND) de dung production

## OTP SDT (READY, CHUA BAT)
- Edge Function send-otp + verify-otp da co
- Admin config eSMS trong Admin Profile
- Can dang ky tai khoan esms.vn (~1000d/tin)
- Brandname can duyet 1-2 ngay

## CAU TRUC THU MUC
- App.js, app.json, eas.json, README.md
- assets/: icon.png (1024x1024) + splash.png (1284x2778)

### lib/
- supabase.js: client
- auth.js: auth + admin + profile + hash bcrypt + crypto fallback
- chat.js: chat HS-GS
- wallet.js: vi + rut tien + instant payout
- notif.js: he thong thong bao
- notifications.js: push (chi APK)
- upload.js: upload anh (FileSystem legacy + base64-arraybuffer)
- reviews.js: danh gia 2 chieu
- myTutors.js: GS cua HS
- adminTutor.js: admin tao/sua tutor
- adminSettings.js: settings + disputes + revenue
- adminConfig.js: admin config eSMS/DeepSeek
- tutorSchedule.js: lich ranh
- announce.js: announcements
- favorites.js: wishlist
- otp.js: send/verify OTP
- pollUnread.js

### lib/ai/
- chat.js: gui cau hoi den Edge Function
- storage.js: luu chat local (AsyncStorage) + cloud (Supabase)
- context.js: build ngu canh user cho AI

### components/
- BottomNav.js, TutorBottomNav.js, AdminBottomNav.js
- AnnouncementBanner.js (banner + modal)
- Skeleton.js (TutorCard, CourseCard, SessionCard)
- ErrorCatcher.js
- AIFloatingButton.js (keo duoc)
- AIChatBox.js (markdown + code block + latex + table converter)

### screens/
- AuthScreen, MainTabs, TutorMainTabs, AdminMainTabs
- HomeScreen, AllTutorsScreen, TutorDetailScreen (3 tabs + tim + share)
- BookingScreen, PaymentScreen
- CoursesScreen, CourseDetailScreen
- NotificationsScreen, NotificationDetailScreen
- ProfileScreen, MyTutorsScreen, WishlistScreen
- chat/ChatListScreen, chat/ChatDetailScreen
- profile/EditProfileScreen, ChangePasswordScreen, BankScreen, SupportScreen, TermsScreen
- tutor/ScheduleScreen, StudentsScreen, StudentDetailScreen, ReviewStudentScreen
- tutor/WalletScreen, WithdrawScreen, TutorProfileScreen
- tutor/TutorEditProfileScreen, MyReviewsScreen, SetScheduleScreen, RevenueScreen
- admin/DashboardScreen, OrdersScreen, WithdrawsScreen
- admin/UsersScreen, AdminTutorsScreen, CreateTutorScreen
- admin/AnnouncementsScreen, CommissionScreen, SystemSettingsScreen
- admin/DisputesScreen, ESMSConfigScreen, DeepSeekConfigScreen, AdminProfileScreen

## DATABASE TABLES (19 bang)
1. users: id, phone, password (bcrypt), role, full_name, avatar_url, status, push_token, is_available
2. tutor_profiles: user_id, bio, subjects[], price_per_session, rating_*, experience_years, cccd_*, contract_*, bank_*, verify_status, available_slots
3. courses: id, student_id, tutor_id, subject, total_sessions, price_per_session, total_price, payment_type, paid_amount, commission_rate, status, schedule
4. sessions: id, course_id, session_number, scheduled_at, status, customer_confirmed_at, tutor_payout, app_fee
5. session_reviews: id, session_id, reviewer_id, reviewer_role, rating, comment
6. wallets: user_id, balance_available, balance_pending
7. transactions: id, user_id, type, amount, status, ref_id, note
8. withdraw_requests: id, user_id, amount, bank_*, status, note
9. orders: id, order_code, student_id, course_id, amount, status, bill_url, expires_at
10. disputes: id, session_id, raised_by, reason, evidence_urls[], status, resolution_note
11. settings: key, value
12. conversations: id, student_id, tutor_id, last_message, last_message_at
13. messages: id, conversation_id, sender_id, content, read_at
14. notifications: id, user_id, title, body, type, ref_id, read_at
15. announcements: id, title, content, type, active, created_by, expires_at
16. favorites: id, student_id, tutor_id, created_at
17. ai_chats: id, user_id, role, content, model, tokens, created_at
18. admin_configs: key, value, is_secret, description, updated_at (RLS block client)
19. otp_codes: id, phone, code, expires_at, used, attempts, created_at

Realtime bat: messages, conversations, notifications

## DA LAM

### He thong
- DB 19 bang + RLS + seed
- Auth: bcrypt + auto-migrate plain text + OTP flow (ready)
- Persist session (AsyncStorage)
- Realtime chat + notifications
- Upload anh (avatar + bill)
- Skeleton loading
- UI polish: shadow, hierarchy

### Hoc sinh (5 tab)
- Home + filter danh muc + search + skeleton
- AllTutors: sort + filter nang cao
- TutorDetail: 3 tab (Thong tin / Danh gia / Cua toi) + tim + share
- Booking + Payment + upload bill
- Courses + CourseDetail (xac nhan buoi + danh gia)
- Chat + Notifications + MyTutors + Wishlist
- Profile 7 menu

### Gia su (6 tab)
- Schedule (skeleton + filter)
- Students + StudentDetail + ReviewStudent (GV danh gia HS)
- Wallet + Withdraw
- Profile 9 menu + toggle nhan lop
- TutorEditProfile + SetSchedule + Revenue + MyReviews

### Admin (5 tab)
- Dashboard + revenue chart + 4 nut
- Orders + Withdraws + AdminTutors + Users
- Commission + SystemSettings + Disputes
- Announcements + eSMS + DeepSeek config
- AdminProfile 8 menu

### AI Tro ly
- Nut noi keo duoc (Animated + PanResponder)
- Chat box markdown
- Code block + copy button (expo-clipboard)
- Latex -> Unicode converter
- Table -> Bullet converter (fallback)
- Phan cap Flash/Pro theo khoa hoc
- Rate limit admin set

### Bao mat
- Hash bcrypt + crypto fallback Hermes
- Admin reset password hashed
- AI tu choi cau hoi ve password/vi tien/SDT
- Config luu DB (RLS block client)

## CON LAI
### Uu tien cao
- Push notification giong Zalo (pg_net trigger) - cho hoi ben dai hoc
- OTP SDT hoan chinh (can tai khoan esms.vn)
- Meet link trong session (nut "Vao hoc")
- Huy buoi truoc 24h

### Trung binh
- Doi icon + splash dep hon
- Tu dong chuyen pending -> available sau 7 ngay
- Thong bao buoi sap toi
- Build APK production + xoa DB

### Thap
- eKYC CCCD
- Ho kinh doanh + tai khoan doanh nghiep ACB
- Hop dong dien tu
- Dark mode

## QUY UOC CODE
- Mau HS + tutor: 2563EB
- Mau admin: 7C3AED
- Mau thanh cong: 10B981
- Mau canh bao: F59E0B
- Mau loi: EF4444
- Bo goc: 16-20px card, 20-22px button
- Font weight: 800 heading, 700 subheading
- SafeAreaView tu react-native-safe-area-context
- UI tieng Viet
- Gia: toLocaleString('vi-VN')
- Tao file: cat > file.js << 'EOF' ... EOF (FULL CODE, KHONG keu tim dong)
- KHONG dung nano, KHONG dung backtick trong heredoc

## QUY TRINH
1. Termux session 1: cd ~/projects/EduTeach && npx expo start
2. Test tren Expo Go
3. Build APK: EAS_SKIP_AUTO_FINGERPRINT=1 eas build -p android --profile preview
4. Cai APK + test

## BUILD APK
- EAS_SKIP_AUTO_FINGERPRINT=1 eas build -p android --profile preview
- EAS CLI: v24.10.0
- Free tier: 10-30 phut
- expo-doctor phai pass 21/21 truoc khi build

## LUU Y CHO CHAT MOI
- Chu du an: Ho Van Hoa - vibe coder, KHONG co may tinh, code 100% Termux Android
- KHONG hoi lai tech stack/database - da co trong README
- User thich ngan gon, co structure
- GUI FULL CODE bang cat EOF - KHONG bao user tim dong
- KHONG dung nano - luon cat > file << 'EOF'
- Nhac user KHONG bam Ctrl+C khi paste heredoc
- Push notification chi hoat dong o APK (SDK 53+ bo push trong Expo Go)
- bcryptjs can setRandomFallback voi expo-crypto tren Hermes
- expo-file-system dung import tu 'expo-file-system/legacy'
- Upload anh: readAsStringAsync + base64-arraybuffer + contentType
- Edge Functions deploy qua Supabase Dashboard (khong can CLI)
- JWT Verification: OFF cho tat ca Edge Functions
- Khi fix bug: chay npx expo-doctor truoc, fix het warning roi build
- AI config trong bang admin_configs (RLS block client)
- AI tu choi cau hoi ve password/vi tien/SDT
- AI khong duoc dung bang markdown, phai dung bullet

## LINKS
- GitHub: https://github.com/vanhoa282/EduTeach
- Supabase: https://supabase.com/dashboard
- Expo: https://expo.dev
- DeepSeek: https://platform.deepseek.com
- eSMS: https://esms.vn

## VERSION
Last update: 2026-10-06
Version: MVP 1.4 (AI tro ly hoan chinh + code block + table converter + latex)

---

## 🛡️ Hệ thống khiếu nại buổi học

Hệ thống cho phép học sinh gửi khiếu nại đối với buổi học và Admin xử lý trực tiếp trong trang quản trị.

### Luồng xử lý

Học sinh gửi khiếu nại:

- `disputes.status = open`
- `sessions.status = disputed`
- Admin nhận thông báo có khiếu nại mới.

Nếu Admin CHẤP NHẬN khiếu nại:

- `disputes.status = resolved`
- `sessions.status = cancelled`
- Học sinh nhận thông báo kết quả xử lý.

Nếu Admin BÁC BỎ khiếu nại:

- `disputes.status = rejected`
- `sessions.status = confirmed`
- Buổi học được công nhận.
- Gia sư được thanh toán.
- Học sinh nhận thông báo kết quả.
- Buổi học auto-confirm sau khi khiếu nại bị bác bỏ không được đánh giá.

### Phía học sinh

- Có nút gửi khiếu nại tại buổi học.
- Bắt buộc nhập lý do khiếu nại.
- Không tạo trùng khiếu nại `open` cho cùng buổi học/người gửi.
- Khi gửi thành công, session chuyển sang `disputed`.
- Admin được gửi notification.

### Phía Admin

Màn hình quản lý khiếu nại hỗ trợ:

- Xem danh sách khiếu nại.
- Lọc Chờ xử lý.
- Lọc Đã chấp nhận.
- Lọc Đã bác bỏ.
- Xem tất cả.
- Xem thông tin học sinh, gia sư, môn học và buổi học.
- Xem lý do khiếu nại.
- Nhập ghi chú xử lý.
- Chấp nhận khiếu nại.
- Bác bỏ khiếu nại.
- Refresh danh sách sau khi xử lý.

### Trạng thái disputes

| Status | Ý nghĩa |
| --- | --- |
| `open` | Đang chờ Admin xử lý |
| `resolved` | Admin chấp nhận khiếu nại |
| `rejected` | Admin bác bỏ khiếu nại |

### Supabase RLS

Bảng `disputes` đang sử dụng Row Level Security.

Các policy cần thiết:

- `disputes_insert`: cho phép tạo khiếu nại.
- `disputes_select`: cho phép đọc khiếu nại.
- `disputes_admin_update`: cho phép Admin cập nhật kết quả xử lý.

Lưu ý quan trọng:

Nếu thiếu `disputes_admin_update`, phần course/session và notification có thể đã cập nhật thành công nhưng `disputes.status` vẫn là `open`.

Khi đó màn hình Admin vẫn hiển thị đơn ở mục "Chờ xử lý".

Đây là lỗi đã được phát hiện và bổ sung policy UPDATE cho Admin.

### Các file liên quan

- `lib/disputes.js`
- `lib/adminSettings.js`
- `lib/wallet.js`
- `screens/CourseDetailScreen.js`
- `screens/admin/DisputesScreen.js`

### Payout khi bác bỏ khiếu nại

Khi Admin bác bỏ:

1. Khiếu nại chuyển sang `rejected`.
2. Session chuyển sang `confirmed`.
3. Gia sư được thanh toán cho buổi học.
4. Phí nền tảng được ghi nhận.
5. Hệ thống sử dụng `tutor_payout` để nhận biết session đã payout.
6. Học sinh không được đánh giá session được auto-confirm sau khi khiếu nại bị bác bỏ.

### TODO bảo mật giao dịch

Trước khi triển khai giao dịch tiền thật production, nên chuyển toàn bộ quá trình payout sang PostgreSQL RPC/transaction và bổ sung cơ chế chống double payout ở cấp database.


---

## 🛡️ Hệ thống khiếu nại buổi học

Hệ thống cho phép học sinh gửi khiếu nại đối với buổi học và Admin xử lý trực tiếp trong trang quản trị.

### Luồng xử lý

Học sinh gửi khiếu nại:

- `disputes.status = open`
- `sessions.status = disputed`
- Admin nhận thông báo có khiếu nại mới.

Nếu Admin CHẤP NHẬN khiếu nại:

- `disputes.status = resolved`
- `sessions.status = cancelled`
- Học sinh nhận thông báo kết quả xử lý.

Nếu Admin BÁC BỎ khiếu nại:

- `disputes.status = rejected`
- `sessions.status = confirmed`
- Buổi học được công nhận.
- Gia sư được thanh toán.
- Học sinh nhận thông báo kết quả.
- Buổi học auto-confirm sau khi khiếu nại bị bác bỏ không được đánh giá.

### Phía học sinh

- Có nút gửi khiếu nại tại buổi học.
- Bắt buộc nhập lý do khiếu nại.
- Không tạo trùng khiếu nại `open` cho cùng buổi học/người gửi.
- Khi gửi thành công, session chuyển sang `disputed`.
- Admin được gửi notification.

### Phía Admin

Màn hình quản lý khiếu nại hỗ trợ:

- Xem danh sách khiếu nại.
- Lọc Chờ xử lý.
- Lọc Đã chấp nhận.
- Lọc Đã bác bỏ.
- Xem tất cả.
- Xem thông tin học sinh, gia sư, môn học và buổi học.
- Xem lý do khiếu nại.
- Nhập ghi chú xử lý.
- Chấp nhận khiếu nại.
- Bác bỏ khiếu nại.
- Refresh danh sách sau khi xử lý.

### Trạng thái disputes

| Status | Ý nghĩa |
| --- | --- |
| `open` | Đang chờ Admin xử lý |
| `resolved` | Admin chấp nhận khiếu nại |
| `rejected` | Admin bác bỏ khiếu nại |

### Supabase RLS

Bảng `disputes` đang sử dụng Row Level Security.

Các policy cần thiết:

- `disputes_insert`: cho phép tạo khiếu nại.
- `disputes_select`: cho phép đọc khiếu nại.
- `disputes_admin_update`: cho phép Admin cập nhật kết quả xử lý.

Lưu ý quan trọng:

Nếu thiếu `disputes_admin_update`, phần course/session và notification có thể đã cập nhật thành công nhưng `disputes.status` vẫn là `open`.

Khi đó màn hình Admin vẫn hiển thị đơn ở mục "Chờ xử lý".

Đây là lỗi đã được phát hiện và bổ sung policy UPDATE cho Admin.

### Các file liên quan

- `lib/disputes.js`
- `lib/adminSettings.js`
- `lib/wallet.js`
- `screens/CourseDetailScreen.js`
- `screens/admin/DisputesScreen.js`

### Payout khi bác bỏ khiếu nại

Khi Admin bác bỏ:

1. Khiếu nại chuyển sang `rejected`.
2. Session chuyển sang `confirmed`.
3. Gia sư được thanh toán cho buổi học.
4. Phí nền tảng được ghi nhận.
5. Hệ thống sử dụng `tutor_payout` để nhận biết session đã payout.
6. Học sinh không được đánh giá session được auto-confirm sau khi khiếu nại bị bác bỏ.

### TODO bảo mật giao dịch

Trước khi triển khai giao dịch tiền thật production, nên chuyển toàn bộ quá trình payout sang PostgreSQL RPC/transaction và bổ sung cơ chế chống double payout ở cấp database.

---

## 🔔 Push Notification Android

EduTeach hỗ trợ thông báo đẩy Android qua Expo Notifications, Firebase Cloud Messaging (FCM V1) và Supabase Edge Functions.

### Chức năng

- Tin nhắn mới: thông báo cho người nhận khi ứng dụng chạy nền.
- Thông báo Admin: hỗ trợ gửi đến tất cả (`all`), học sinh (`student`) hoặc gia sư (`tutor`).
- Thông báo hệ thống: gửi đến tài khoản được chỉ định.
- Nội dung thông báo xuất hiện trên thanh trạng thái Android.

### Kiến trúc

1. Ứng dụng xin quyền thông báo và lấy Expo Push Token.
2. Token được lưu vào `public.users.push_token`.
3. Supabase Database Webhook nhận sự kiện INSERT.
4. Edge Function `push-webhook` xác định người nhận.
5. Expo Push Service chuyển thông báo qua FCM đến Android.

### Database Webhooks

| Webhook | Bảng | Event |
| --- | --- | --- |
| `push_messages` | `public.messages` | INSERT |
| `push_announcements` | `public.announcements` | INSERT |
| `push_notifications` | `public.notifications` | INSERT |

Cả ba webhook gọi:

`https://jrkqfalwcleetppqtcvb.supabase.co/functions/v1/push-webhook`

- Method: `POST`
- Header: `Content-Type: application/json`
- Header: `x-eduteach-webhook-secret` với giá trị trùng secret trên Supabase.

### Cấu hình Supabase

- Edge Function: `push-webhook`
- Verify JWT: OFF (function xác thực webhook bằng secret riêng).
- Secret: `PUSH_WEBHOOK_SECRET`
- Function sử dụng biến môi trường Supabase để truy vấn người nhận.

### Các file liên quan

- `lib/notifications.js`
- `App.js`
- `supabase/functions/push-webhook/index.ts`
- `lib/announce.js`
- `screens/admin/AnnouncementsScreen.js`
- `components/AnnouncementBanner.js`

### Kiểm thử

Đã xác nhận thông báo tin nhắn mới xuất hiện trên thanh thông báo Android.

Lưu ý:
- Mỗi thiết bị phải cấp quyền thông báo và đăng ký push token.
- Tài khoản chưa có token sẽ không nhận push trên thiết bị.
- Database Webhooks và Edge Function Secrets được cấu hình trên Supabase, không tự đồng bộ theo Git.
- Không commit Firebase Admin SDK private key, service-role key hoặc webhook secret lên GitHub.
- Cần kiểm thử riêng thông báo Admin, thông báo hệ thống và điều hướng khi chạm thông báo.


---

## EDUTEACH INVOICE MANAGEMENT 2026

### Student invoice management
- Entry point: PaymentScreen, directly below "Tạo mã đơn và QR chuyển khoản".
- The invoice list is scoped to the student account, not the selected tutor.
- UI component: components/InvoiceManager.js.
- Notification modal: components/PaymentNotice.js.
- Statistics: total invoices, paid, pending, cancelled/expired.
- Revenue statistics count paid invoices only.
- Pending invoices display a countdown and cancellation option.
- Paid invoices remain in the history and cannot be cancelled.

### Payment workflow
1. Student selects a tutor and creates a course booking.
2. App creates a pending course and payment order.
3. The order receives a unique EDT payment reference.
4. Student pays using the VietQR information.
5. The existing bank reconciliation system verifies the payment.
6. A verified payment activates the corresponding course.

### Invoice rules
- Maximum 2 pending invoices per student account.
- Pending invoices expire after 30 minutes.
- Expired invoices are marked cancelled and retained in history.
- Manual cancellation requires a per-invoice secret.
- Newly created invoices store a hash of the cancellation secret.
- The cancellation secret is kept locally using AsyncStorage.
- Legacy invoices without a secret cannot be cancelled using this method.
- Never automatically treat an unverified bank transfer as unpaid forever.
- Late bank reconciliation and expired payments require careful handling.

### Supabase
Relevant database objects:
- public.orders
- public.enforce_eduteach_invoice_limit()
- public.expire_eduteach_invoices()
- public.cancel_eduteach_invoice(uuid, text)
- public.guard_eduteach_invoice_payment()

The expiration task is scheduled using pg_cron.

Important: Database SQL must be applied separately in Supabase.
Git backup does not back up the live Supabase database, SQL functions,
cron configuration or deployed Edge Functions.

### Security and production readiness
- Do not expose database errors, API provider names, stack traces or tokens
  in customer-facing messages.
- Never use a client-supplied student_id as the sole authorization mechanism.
- Verify server-side access controls for invoice listing before production.
- Cancellation secrets must never be written to logs or Git.
- Test payment reconciliation near the 30-minute expiration boundary.
- Validate that late confirmed transfers are not lost.
- Test all invoice states before production release.

### Development on Termux
cd ~/projects/EduTeach
EXPO_NO_DEVTOOLS=1 npx expo start --dev-client --lan --clear

### Release checklist
- [ ] Verify student invoice isolation and authorization.
- [ ] Verify invoice management opens from PaymentScreen.
- [ ] Verify invoices across multiple tutors appear together.
- [ ] Verify 2-pending-invoice limit.
- [ ] Verify automatic expiration after 30 minutes.
- [ ] Verify manual cancellation with a valid secret.
- [ ] Verify paid invoices cannot be cancelled.
- [ ] Verify late bank transaction reconciliation.
- [ ] Verify customer-facing messages contain no technical details.
- [ ] Test on Android Dev Build before production release.
