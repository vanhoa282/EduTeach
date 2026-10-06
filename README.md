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
