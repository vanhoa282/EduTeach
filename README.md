# EduTeach - App Gia Su

## TONG QUAN
App mobile ket noi hoc sinh va gia su. 3 role: student, tutor, admin.
Phuc vu chu yeu cho sinh vien su pham nam 1-4 va cac thay co co lich ranh.

## TECH STACK
- React Native + Expo SDK 57
- Supabase (Postgres + Realtime + Storage)
- @expo/vector-icons (Ionicons)
- react-native-safe-area-context
- AsyncStorage (persist session)
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
- App.js: entry, phan nhanh role, push setup
- app.json: Expo config + EAS
- eas.json: EAS build profiles

### lib/
- supabase.js: client
- auth.js: auth + admin + profile helpers
- chat.js: conversations + messages
- wallet.js: vi + rut tien + cong tien (instant payout)
- notif.js: he thong thong bao
- notifications.js: push (chi APK)
- sound.js: am thanh
- upload.js: chon/chup/upload anh
- reviews.js: lay danh gia gia su
- myTutors.js: lay gia su cua HS
- adminTutor.js: admin tao/sua tutor
- adminSettings.js: settings + disputes + revenue
- tutorSchedule.js: lich ranh gia su
- announce.js: he thong announcements
- pollUnread.js: poll du phong

### components/
- BottomNav.js: nav HS (5 tab)
- TutorBottomNav.js: nav tutor (6 tab)
- AdminBottomNav.js: nav admin (5 tab)
- AnnouncementBanner.js: banner thong bao + modal chi tiet

### screens/
- AuthScreen, MainTabs, TutorMainTabs, AdminMainTabs
- HomeScreen: list gia su + filter danh muc + banner
- AllTutorsScreen: sort + filter nang cao (gia, kinh nghiem)
- TutorDetailScreen: thong tin + danh gia + lich ranh + chat
- BookingScreen: chon buoi + lich + PTTT
- PaymentScreen: STK ACB + ma EDT + upload bill
- CoursesScreen, CourseDetailScreen
- NotificationsScreen, NotificationDetailScreen
- ProfileScreen, MyTutorsScreen
- chat/ChatListScreen, chat/ChatDetailScreen
- profile/EditProfileScreen, ChangePasswordScreen, BankScreen, SupportScreen, TermsScreen
- tutor/ScheduleScreen: filter + banner
- tutor/StudentsScreen: list + chat + dem buoi
- tutor/StudentDetailScreen: profile HS + list khoa
- tutor/WalletScreen: so du + tab rut tien
- tutor/WithdrawScreen
- tutor/TutorProfileScreen: toggle nhan lop + 9 menu
- tutor/TutorEditProfileScreen: bio + mon + gia
- tutor/MyReviewsScreen: bar chart + filter sao
- tutor/SetScheduleScreen: grid 7 ngay x 12 gio
- tutor/RevenueScreen: bieu do 6 thang
- admin/DashboardScreen: stats + revenue + 4 nut
- admin/OrdersScreen: xem bill + duyet
- admin/WithdrawsScreen: duyet rut
- admin/UsersScreen: filter + doi role + reset pass
- admin/AdminTutorsScreen: list tutor + tao
- admin/CreateTutorScreen: form tao tutor
- admin/AnnouncementsScreen: CRUD thong bao
- admin/CommissionScreen: cau hinh hoa hong
- admin/SystemSettingsScreen: min/max rut
- admin/DisputesScreen: khieu nai
- admin/AdminProfileScreen: 7 menu

## DATABASE TABLES
1. users: id, phone, password, role, full_name, avatar_url, status, push_token, is_available
2. tutor_profiles: user_id, bio, subjects[], price_per_session, rating_avg, rating_count, experience_years, cccd_*, contract_*, bank_*, verify_status, available_slots (jsonb)
3. courses: id, student_id, tutor_id, subject, total_sessions, price_per_session, total_price, payment_type, paid_amount, commission_rate, status, schedule
4. sessions: id, course_id, session_number, scheduled_at, status, customer_confirmed_at, tutor_payout, app_fee
5. session_reviews: id, session_id, rating (1-5), comment
6. wallets: user_id, balance_available, balance_pending
7. transactions: id, user_id, type, amount, status, ref_id, note
8. withdraw_requests: id, user_id, amount, bank_*, status, note
9. orders: id, order_code, student_id, course_id, amount, status, bill_url, expires_at
10. disputes: id, session_id, raised_by, reason, evidence_urls[], status, resolution_note
11. settings: key, value (commission_rate, min_withdraw, max_withdraw, pending_days, auto_pass_hours)
12. conversations: id, student_id, tutor_id, last_message, last_message_at
13. messages: id, conversation_id, sender_id, content, read_at
14. notifications: id, user_id, title, body, type, ref_id, read_at
15. announcements: id, title, content, type, active, created_by, expires_at

Realtime bat: messages, conversations, notifications

## TRANG THAI HOAN THANH

### HE THONG - 100%
- DB 15 bang + RLS + seed
- Auth: login/signup 2 tab (student/tutor)
- Persist session (AsyncStorage auto-login)
- Realtime chat + notifications
- Sound trong app khi co tin
- Upload anh (avatar, bill)
- He thong thong bao + banner + modal chi tiet

### HOC SINH - 100%
- Home: list gia su + filter danh muc + search + banner
- AllTutors: sort + filter nang cao (gia, kinh nghiem)
- Chi tiet gia su: info + danh gia (bar chart, filter sao) + lich ranh + nut chat
- Booking: 10/20/30 buoi + discount + lich + PTTT 100/50
- Payment: STK ACB + ma EDT + countdown + upload bill that
- Khoa hoc: list tu Supabase
- Chi tiet khoa: sessions + xac nhan + danh gia 1-5 sao + khieu nai
- Chat realtime + optimistic update
- Thong bao + chi tiet
- MyTutors: gia su dang hoc
- Profile: edit info + avatar, doi pass, STK, ho tro, dieu khoan

### GIA SU - 100%
- 6 tab: Lich day, Hoc sinh, Tin nhan, Thong bao, Vi, Tai khoan
- Lich day: banner + filter (hom nay/tuan/tat ca/da day)
- Hoc sinh: list + dem buoi chinh xac + nut chat + chi tiet
- Chi tiet HS: profile + stats + list khoa + sessions
- Vi: so du available (instant payout, khong giam) + tab rut tien
- Withdraw: form rut
- Profile: toggle nhan lop + 9 menu
- Ho so gia su: bio + mon + gia + kinh nghiem
- Lich ranh: grid 7 ngay x 12 gio
- Doanh thu: bieu do 6 thang
- Danh gia cua HS: bar chart + filter
- Nhan thong bao tu dong day du

### ADMIN - 100%
- 5 tab: Tong quan, Don hang, Rut tien, Gia su, Users
- Dashboard: stats + card doanh thu tim + bieu do 6 thang + 4 nut thao tac
- Duyet don: xem bill + duyet/tu choi + tao sessions + thong bao
- Duyet rut: tru vi + thong bao
- Gia su: list + tao account + reset pass + khoa
- Users: filter + doi role + reset pass + khoa
- Cau hinh hoa hong: % + vi du
- Cai dat he thong: min/max rut, so ngay duyet, so gio auto
- Khieu nai: list + xu ly
- Announcements: CRUD thong bao he thong
- Admin profile + 7 menu

## QUY UOC CODE
- Mau HS + tutor: 2563EB
- Mau admin: 7C3AED
- Mau thanh cong: 10B981
- Mau canh bao: F59E0B
- Mau loi: EF4444
- SafeAreaView tu react-native-safe-area-context
- StyleSheet.create cuoi file
- UI tieng Viet
- Gia: toLocaleString('vi-VN')
- Tao file: cat > file.js << 'EOF' ... EOF
- KHONG dung backtick trong heredoc
- Placeholder value dung dau ngoac don

## QUY TRINH
1. Termux session 1: cd ~/projects/EduTeach && npx expo start
2. Test tren Expo Go (dev)
3. Build APK: eas build -p android --profile preview
4. Cài APK + test production

## BUILD APK
- cd ~/projects/EduTeach
- EAS_SKIP_AUTO_FINGERPRINT=1 eas build -p android --profile preview
- EAS CLI: v24.10.0
- Free tier: 10-30 phut cho build
- Lan dau build se hoi:
  - Generate Android Keystore? -> Y
  - Upload keystore? -> N
  - Commit changes? -> Y

## LUU Y CHO CHAT MOI
- Chu du an: Ho Van Hoa - vibe coder, KHONG co may tinh, code 100% tren Termux Android
- KHONG hoi lai tech stack/database/cau truc - da co trong README
- User thich ngan gon, co structure (heading, bullet, code block)
- GUI FULL CODE khi update file - KHONG keu user tim roi thay
- Tao file: cat > file.js << 'EOF' ... EOF (kem EOF vao cuoi, paste 1 lan)
- Nhac user KHONG bam Ctrl+C khi dang paste heredoc
- Tao folder moi: mkdir -p truoc
- Push notification chi hoat dong o APK, KHONG hoat dong trong Expo Go
- Tranh dung backtick trong heredoc khi tao file JS
- Build APK mat 10-30 phut voi free tier
- Termux co the treo o buoc "Computing project fingerprint" -> dung EAS_SKIP_AUTO_FINGERPRINT=1

## LINKS
- GitHub: https://github.com/vanhoa282/EduTeach
- Supabase: https://supabase.com/dashboard
- Expo: https://expo.dev
- EAS Builds: https://expo.dev/accounts/vanhoa282/projects/EduTeach/builds

## TINH NANG CON LAI (khong can cho MVP)
### Uu tien cao
- Push notification that khi tat app (da co code, can test APK)
- Danh gia hoc sinh tu phia gia su
- Filter nang cao them (gioi tinh, hinh thuc day)

### Trung binh
- Wishlist / yeu thich gia su
- Chia se link gia su
- Tu dong chuyen pending sang available sau 7 ngay (cron)
- Thong bao buoi hoc sap toi
- Doi icon + splash

### Thap
- Hash password bcrypt
- eKYC CCCD gia su
- Thong ke admin nang cao (bieu do doanh thu chi tiet)
- Dark mode

## VERSION
Last update: 2026-10-05
Version: MVP 1.0 (hoan thanh 100% tinh nang co ban)
