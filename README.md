# EduTeach - App Gia Su

## TONG QUAN
App mobile ket noi hoc sinh va gia su. 3 role: student, tutor, admin.
Phuc vu sinh vien su pham va cac thay co co lich ranh.

## TECH STACK
- React Native + Expo SDK 57
- Supabase (Postgres + Realtime + Storage)
- @expo/vector-icons (Ionicons)
- react-native-safe-area-context
- AsyncStorage (persist session)
- bcryptjs + expo-crypto (hash password)
- expo-image-picker (upload anh)
- EAS Build cho APK

## SUPABASE
- URL: https://jrkqfalwcleetppqtcvb.supabase.co
- anon key: sb_publishable_dvrXZVCmpFRnrAjMwTA53g_31nvYNCT
- EAS projectId: dc90e3c4-6404-499c-9861-61f3b266d8b2
- Owner: vanhoa282
- Storage bucket: bills (public)

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

## CAU TRUC THU MUC
- App.js: entry, phan nhanh role
- app.json: Expo config + EAS
- eas.json: build profiles
- assets/: icon.png (1024x1024) + splash.png (1284x2778)

### lib/
- supabase.js: client
- auth.js: auth + admin + profile + hash password bcrypt
- chat.js: conversations + messages
- wallet.js: vi + rut tien + cong tien (instant payout)
- notif.js: he thong thong bao
- notifications.js: push (chi APK)
- sound.js: am thanh (tam bo)
- upload.js: chon/chup/upload anh (dung expo/fetch)
- reviews.js: danh gia GV + HS (2 chieu)
- myTutors.js: gia su cua HS
- adminTutor.js: admin tao/sua tutor + hash
- adminSettings.js: settings + disputes + revenue
- tutorSchedule.js: lich ranh gia su
- announce.js: he thong announcements
- favorites.js: wishlist
- pollUnread.js: poll du phong

### components/
- BottomNav.js: nav HS (5 tab)
- TutorBottomNav.js: nav tutor (6 tab)
- AdminBottomNav.js: nav admin (5 tab)
- AnnouncementBanner.js: banner + modal chi tiet
- Skeleton.js: loading skeleton (TutorCard, CourseCard, SessionCard)

### screens/
- AuthScreen, MainTabs, TutorMainTabs, AdminMainTabs
- HomeScreen: skeleton + banner + filter danh muc
- AllTutorsScreen: sort + filter nang cao
- TutorDetailScreen: 3 tabs (Thong tin / Danh gia / Cua toi) + tim + share
- BookingScreen, PaymentScreen
- CoursesScreen: skeleton
- CourseDetailScreen: sessions + xac nhan + danh gia
- NotificationsScreen, NotificationDetailScreen
- ProfileScreen, MyTutorsScreen, WishlistScreen
- chat/ChatListScreen, chat/ChatDetailScreen
- profile/EditProfileScreen, ChangePasswordScreen, BankScreen, SupportScreen, TermsScreen
- tutor/ScheduleScreen (skeleton + banner), StudentsScreen, StudentDetailScreen (co review)
- tutor/WalletScreen, WithdrawScreen, TutorProfileScreen (toggle + 9 menu)
- tutor/TutorEditProfileScreen, MyReviewsScreen, SetScheduleScreen, RevenueScreen
- tutor/ReviewStudentScreen (GV danh gia HS)
- admin/DashboardScreen (stats + revenue + 4 nut), OrdersScreen (xem bill), WithdrawsScreen
- admin/UsersScreen (filter + reset pass), AdminTutorsScreen, CreateTutorScreen
- admin/AnnouncementsScreen, CommissionScreen, SystemSettingsScreen, DisputesScreen
- admin/AdminProfileScreen

## DATABASE TABLES
1. users: id, phone, password (bcrypt), role, full_name, avatar_url, status, push_token, is_available
2. tutor_profiles: user_id, bio, subjects[], price_per_session, rating_avg, rating_count, experience_years, cccd_*, contract_*, bank_*, verify_status, available_slots
3. courses: id, student_id, tutor_id, subject, total_sessions, price_per_session, total_price, payment_type, paid_amount, commission_rate, status, schedule
4. sessions: id, course_id, session_number, scheduled_at, status, customer_confirmed_at, tutor_payout, app_fee
5. session_reviews: id, session_id, reviewer_id, reviewer_role, rating (1-5), comment
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
16. favorites: id, student_id, tutor_id, created_at (unique student+tutor)

Realtime bat: messages, conversations, notifications

## DA LAM

### He thong
- DB 16 bang + RLS + seed
- Auth: login/signup 2 tab + bcrypt hash + auto-migrate plain text
- Persist session (AsyncStorage)
- Realtime chat + notifications
- He thong thong bao + banner + modal
- Upload anh (avatar + bill) len Supabase Storage
- Skeleton loading (TutorCard, CourseCard, SessionCard)
- UI polish: shadow, hierarchy, bo goc 18-20px

### Hoc sinh (5 tab)
- Home: list gia su + filter danh muc + search + skeleton
- AllTutors: sort (rating/gia/review) + filter nang cao (gia, kinh nghiem)
- TutorDetail: 3 tab (Thong tin / Danh gia / Cua toi) + tim + share
- Booking: 10/20/30 buoi + discount + lich + PTTT 100/50
- Payment: STK ACB + ma EDT + countdown + upload bill that
- Courses: skeleton + list
- CourseDetail: sessions + xac nhan + danh gia 1-5 sao + khieu nai
- Chat realtime + optimistic
- Notifications + chi tiet
- MyTutors: gia su dang hoc
- Wishlist: yeu thich gia su
- Profile: 7 menu

### Gia su (6 tab)
- Schedule: skeleton + banner + filter
- Students: list + dem buoi chinh xac + chat + chi tiet
- StudentDetail: profile + stats + list khoa + danh gia GV khac
- ReviewStudent: GV danh gia HS
- Wallet: so du (instant payout) + tab rut
- Withdraw: form rut
- TutorProfile: toggle nhan lop + 9 menu
- TutorEditProfile: bio + mon + gia + kinh nghiem
- SetSchedule: grid 7 ngay x 12 gio
- Revenue: bieu do 6 thang
- MyReviews: bar chart + filter sao

### Admin (5 tab)
- Dashboard: stats + card doanh thu tim + bieu do + 4 nut
- Orders: xem bill fullscreen + duyet + tao sessions
- Withdraws: duyet rut
- AdminTutors: list + tao + reset pass
- Users: filter + doi role + reset pass + khoa
- Commission: cau hinh hoa hong
- SystemSettings: min/max rut + auto_pass
- Disputes: khieu nai
- Announcements: CRUD
- AdminProfile: 7 menu

### Bao mat
- Hash password bcrypt (10 rounds)
- Auto-migrate plain text cu sang hash khi login
- Admin reset password (co hash)
- Hermes fallback cho bcrypt (expo-crypto)

### Giao dien
- Icon 1024x1024
- Splash screen 1284x2778
- Skeleton loading thay spinner
- Shadow + hierarchy ro rang
- Bo goc 16-20px

## CON LAI
### Uu tien cao
- Push notification giống Zalo (pg_net trigger) - cho anh hoi ben dai hoc
- OTP SDT (eSMS.vn ~1000d/tin) - chong spam
- Meet link trong session (nut "Vao hoc" thay vi gui link qua chat)
- Huy buoi truoc 24h (khong tinh phi)

### Trung binh
- Tu dong chuyen pending sang available sau 7 ngay
- Thong bao buoi hoc sap toi
- Doi icon + splash cho dep hon
- Build APK production + xoa DB

### Thap
- eKYC CCCD gia su
- Dang ky ho kinh doanh + tai khoan doanh nghiep ACB
- Hop dong dien tu (VNPT SmartCA)
- Dark mode

## QUY UOC CODE
- Mau HS + tutor: 2563EB
- Mau admin: 7C3AED
- Mau thanh cong: 10B981
- Mau canh bao: F59E0B
- Mau loi: EF4444
- Shadow: 0.06-0.08 opacity, radius 10-12
- Bo goc: 16-20px cho card, 20-22px cho button
- Font weight: 800 cho heading, 700 cho subheading
- Letter spacing: -0.3 den -0.5 cho heading lon
- SafeAreaView tu react-native-safe-area-context
- StyleSheet.create cuoi file
- UI tieng Viet
- Gia: toLocaleString('vi-VN')
- Tao file: cat > file.js << 'EOF' ... EOF (full code, KHONG keu tim dong)
- KHONG dung backtick trong heredoc

## QUY TRINH
1. Termux session 1: cd ~/projects/EduTeach && npx expo start
2. Test tren Expo Go
3. Build APK: EAS_SKIP_AUTO_FINGERPRINT=1 eas build -p android --profile preview
4. Cai APK + test production

## BUILD APK
- cd ~/projects/EduTeach
- EAS_SKIP_AUTO_FINGERPRINT=1 eas build -p android --profile preview
- EAS CLI: v24.10.0
- Free tier: 10-30 phut cho build
- Lan dau build hoi:
  - Generate Android Keystore? -> Y
  - Upload keystore? -> N
  - Commit changes? -> Y
- expo-doctor phai pass 21/21 truoc khi build

## LUU Y CHO CHAT MOI
- Chu du an: Ho Van Hoa - vibe coder, KHONG co may tinh, code 100% tren Termux Android
- KHONG hoi lai tech stack/database/cau truc - da co trong README
- User thich ngan gon, co structure (heading, bullet, code block)
- GUI FULL CODE bang cat EOF - KHONG bao user tim dong roi thay
- Khong dung nano - luon dung cat > file << 'EOF'
- Nhac user KHONG bam Ctrl+C khi dang paste heredoc
- Tao folder moi: mkdir -p truoc
- Push notification chi hoat dong o APK (SDK 53+ bo push trong Expo Go)
- Tranh dung backtick trong heredoc
- Build APK mat 10-30 phut voi free tier
- Neu Termux treo o "Computing project fingerprint": dung EAS_SKIP_AUTO_FINGERPRINT=1
- bcryptjs can setRandomFallback voi expo-crypto tren Hermes
- Khi update DB: huong dan user chay SQL truoc khi build

## LINKS
- GitHub: https://github.com/vanhoa282/EduTeach
- Supabase: https://supabase.com/dashboard
- Expo: https://expo.dev
- EAS Builds: https://expo.dev/accounts/vanhoa282/projects/EduTeach/builds

## VERSION
Last update: 2026-10-06
Version: MVP 1.1 (them skeleton + polish UI + hash password)
