# EduTeach - App Gia Su

## TONG QUAN
App mobile ket noi hoc sinh va gia su. 3 role: student, tutor, admin.

## TECH STACK
- React Native + Expo SDK 57
- Supabase (Postgres + Realtime + Storage)
- @expo/vector-icons (Ionicons)
- react-native-safe-area-context
- AsyncStorage (persist session)
- expo-image-picker + expo-file-system (upload bill)
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
- lib/
  - supabase.js: client
  - auth.js: auth + admin + profile helpers
  - chat.js: conversations + messages
  - wallet.js: vi + rut tien + cong tien
  - notif.js: he thong thong bao
  - notifications.js: push (chi APK)
  - sound.js: am thanh
  - upload.js: chon/chup/upload anh
  - reviews.js: lay danh gia gia su
  - myTutors.js: lay gia su cua HS
  - pollUnread.js: poll du phong
- components/
  - BottomNav.js: nav HS (5 tab)
  - TutorBottomNav.js: nav tutor (6 tab)
  - AdminBottomNav.js: nav admin (4 tab)
- screens/
  - AuthScreen, MainTabs, TutorMainTabs, AdminMainTabs
  - HomeScreen, AllTutorsScreen, TutorDetailScreen
  - BookingScreen, PaymentScreen, CoursesScreen, CourseDetailScreen
  - NotificationsScreen, NotificationDetailScreen
  - ProfileScreen, MyTutorsScreen
  - chat/ChatListScreen, chat/ChatDetailScreen
  - profile/EditProfileScreen, ChangePasswordScreen, BankScreen, SupportScreen, TermsScreen
  - tutor/ScheduleScreen, StudentsScreen, StudentDetailScreen, WalletScreen, WithdrawScreen, TutorProfileScreen
  - admin/DashboardScreen, OrdersScreen, WithdrawsScreen, UsersScreen, AdminProfileScreen

## DATABASE TABLES
1. users: id, phone, password, role, full_name, avatar_url, status, push_token
2. tutor_profiles: user_id, bio, subjects[], price_per_session, rating_avg, rating_count, experience_years, cccd_*, contract_*, bank_*, verify_status
3. courses: id, student_id, tutor_id, subject, total_sessions, price_per_session, total_price, payment_type, paid_amount, commission_rate, status, schedule
4. sessions: id, course_id, session_number, scheduled_at, status, customer_confirmed_at, tutor_payout, app_fee
5. session_reviews: id, session_id, rating (1-5), comment
6. wallets: user_id, balance_available, balance_pending
7. transactions: id, user_id, type, amount, status, ref_id, note
8. withdraw_requests: id, user_id, amount, bank_*, status, note
9. orders: id, order_code, student_id, course_id, amount, status, bill_url, expires_at
10. disputes: id, session_id, raised_by, reason, evidence_urls[], status
11. settings: key, value
12. conversations: id, student_id, tutor_id, last_message, last_message_at
13. messages: id, conversation_id, sender_id, content, read_at
14. notifications: id, user_id, title, body, type, ref_id, read_at

Realtime bat: messages, conversations, notifications

## DA LAM
### He thong
- DB 14 bang + RLS + seed
- Auth Login/Signup 2 tab
- Persist session (auto-login)
- Realtime chat + notifications
- Sound trong app khi co tin
- He thong thong bao (badge + chi tiet)
- Upload bill that len Supabase Storage

### Hoc sinh (5 tab: Trang chu, Khoa hoc, Thong bao, Tin nhan, Tai khoan)
- Home: list gia su + filter danh muc + search
- AllTutors: sort + filter + search
- Chi tiet gia su: info + danh gia co thong ke (bar chart, filter 5/4/3/2/1 sao) + nut chat
- Booking: chon buoi + lich + PTTT 100/50
- Payment: STK ACB + ma EDT + countdown + upload bill that
- Khoa hoc: list tu Supabase
- Chi tiet khoa: sessions + xac nhan + danh gia 1-5 sao + khieu nai
- Chat realtime + optimistic update
- Thong bao + chi tiet thong bao
- MyTutors: danh sach gia su dang hoc
- Profile: edit thong tin, doi mat khau, luu STK, ho tro, dieu khoan

### Gia su (6 tab: Lich day, Hoc sinh, Tin nhan, Thong bao, Vi, Tai khoan)
- Lich day: stats + list sessions tu DB
- Hoc sinh: list + nut Nhan tin + Chi tiet
- StudentDetail: profile HS + stats + list khoa + sessions
- Vi: so du + pending + tab Rut tien
- Withdraw: form rut tien
- Profile: edit thong tin, doi mat khau, luu STK

### Admin (4 tab: Tong quan, Don hang, Rut tien, Users)
- Dashboard: stats that
- Duyet don: xem bill + duyet/tu choi + tao sessions tu dong + thong bao
- Duyet rut: tru vi + thong bao
- Users: doi role, khoa/mo

### Vi va Hoa hong
- Vi co balance_available + balance_pending
- HS xac nhan buoi: cong pending cho gia su
- Hoa hong 10% (admin set)
- Transaction log day du

### Thong bao tu dong
- Admin duyet don: HS + gia su
- Admin tu choi don: HS
- HS xac nhan buoi: gia su
- HS danh gia: gia su
- HS khieu nai: admin
- Admin duyet rut: gia su
- Admin tu choi rut: gia su

## CON LAI
### Uu tien cao
- Push notification that khi tat app (da co code, can build APK moi)
- Dem buoi con lai chinh xac (tru sessions da hoc)
- Filter nang cao (gia, kinh nghiem, gioi tinh)

### Trung binh
- Tu dong chuyen pending sang available sau 7 ngay (cron)
- Trang xem danh gia gia su tong hop cho admin
- Thong bao buoi hoc sap toi

### Thap
- Hash password bcrypt
- eKYC CCCD
- Doi icon + splash
- Thong ke admin nang cao (bieu do doanh thu)

## QUY UOC CODE
- Mau: 2563EB (HS + tutor), 7C3AED (admin)
- SafeAreaView tu react-native-safe-area-context
- StyleSheet.create cuoi file
- UI tieng Viet
- Gia: toLocaleString('vi-VN')
- Tao file: cat > file.js << 'EOF' ... EOF (gui full, khong keu user tim thay)
- Tat ca placeholder value trong file .js dung dau ngoac don, KHONG dung backtick trong heredoc

## QUY TRINH
1. Termux session 1: cd ~/projects/EduTeach && npx expo start
2. Termux session 2: cd ~/backend-eduteach && node server.js (neu can)
3. Test tren Expo Go (dev) hoac APK (production)
4. Push: git add . && git commit -m "..." && git push

## BUILD APK
- cd ~/projects/EduTeach
- eas build -p android --profile preview
- EAS CLI: v24.10.0

## LUU Y CHO CHAT MOI
- Chu du an: Ho Van Hoa - vibe coder, KHONG co may tinh, code 100% tren Termux Android
- KHONG hoi lai tech stack/database/cau truc - da co trong README
- User thich ngan gon, co structure (heading, bullet, code block)
- GUI FULL CODE khi update file - KHONG keu user tim roi thay
- Tao file: cat > file.js << 'EOF' ... EOF (kem EOF vao cuoi, paste 1 lan)
- Nhac user KHONG bam Ctrl+C khi dang paste heredoc
- Tao folder moi: mkdir -p truoc
- Push notification chi hoat dong o APK, KHONG hoat dong trong Expo Go
- Khi dung heredoc, TRANH dung backtick trong code JS (gay loi)

## LINKS
- GitHub: https://github.com/vanhoa282/EduTeach
- Supabase: https://supabase.com/dashboard
- Expo: https://expo.dev

## VERSION
Last update: 2026-10-05
Version: MVP 0.9

