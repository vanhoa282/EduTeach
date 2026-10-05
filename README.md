# EduTeach - App Gia Sư

## TỔNG QUAN
App mobile kết nối học sinh ↔ gia sư, 3 role: **student**, **tutor**, **admin**.

## TECH STACK
- Mobile: React Native + Expo SDK 57
- DB: Supabase (Postgres + Storage)
- Icons: @expo/vector-icons (Ionicons)
- Safe area: react-native-safe-area-context

## CẤU TRÚC
```

EduTeach/
├── App.js                     # Entry, phân nhánh role
├── lib/supabase.js            # Client
├── lib/auth.js                # signIn/signUp/admin helpers
├── components/
│   ├── BottomNav.js           # Nav học sinh
│   ├── TutorBottomNav.js      # Nav gia sư
│   └── AdminBottomNav.js      # Nav admin
├── screens/
│   ├── AuthScreen.js          # Login/Signup 2 tab
│   ├── MainTabs.js            # Container HS (có state admin)
│   ├── TutorMainTabs.js       # Container gia sư
│   ├── AdminMainTabs.js       # Container admin
│   ├── HomeScreen.js          # List gia sư (Supabase)
│   ├── CoursesScreen.js       # Khóa học HS (Supabase)
│   ├── NotificationsScreen.js
│   ├── ProfileScreen.js       # Có nút Quản trị nếu admin
│   ├── TutorDetailScreen.js
│   ├── BookingScreen.js       # Chọn buổi + lịch + PTTT
│   ├── PaymentScreen.js       # STK ACB + mã EDT + tạo order
│   ├── tutor/                 # ScheduleScreen, StudentsScreen, WalletScreen, TutorProfileScreen
│   └── admin/                 # DashboardScreen, UsersScreen, CoursesScreen, AdminProfileScreen

```

## DATABASE (Supabase)
**URL:** https://jrkqfalwcleetppqtcvb.supabase.co
**anon key:** sb_publishable_dvrXZVCmpFRnrAjMwTA53g_31nvYNCT

**11 bảng:**
- `users` (id, phone unique, password, role, full_name, avatar_url, status, created_at)
- `tutor_profiles` (user_id, bio, subjects[], price_per_session, rating_avg, rating_count, experience_years, cccd_*, contract_*, verify_status)
- `courses` (id, student_id, tutor_id, subject, total_sessions, price_per_session, total_price, payment_type full/half, paid_amount, commission_rate, status pending_payment/active/completed/cancelled/disputed, schedule)
- `sessions` (id, course_id, session_number, scheduled_at, started_at, ended_at, meet_link, status, customer_confirmed_at, tutor_payout, app_fee)
- `session_reviews` (id, session_id, rating 1-5, comment)
- `wallets` (user_id, balance_available, balance_pending)
- `transactions` (id, user_id, type, amount, status, ref_id, note)
- `withdraw_requests` (id, user_id, amount, bank_*, status)
- `orders` (id, order_code EDTxxxxxx, student_id, course_id, amount, status pending/paid/expired/cancelled, expires_at 30p)
- `disputes` (id, session_id, raised_by, reason, evidence_urls[], status)
- `settings` (key, value): commission_rate=10, min_withdraw=50000, max_withdraw=5000000, pending_days=7, auto_pass_hours=3

## TÀI KHOẢN TEST
- **Admin:** `0325272884` (Hồ Văn Hoà)
- **Gia sư:** `0901111111` (Nguyễn Văn An), `0902222222`, `0903333333` - pass `123456`
- **Học sinh:** `0904444444` (Phạm Quốc Dũng) - pass `123456`

## THANH TOÁN
- **Ngân hàng:** ACB - 25317541 - HO VAN HOA
- **Mã đơn:** EDT + 6 số random
- **Countdown:** 30 phút
- **Backend ACB:** `~/backend-eduteach/server.js` (đang lỗi 403 endpoint transaction-history)

## ĐÃ LÀM
### DB + Auth
- 11 bảng + RLS policies + seed 4 gia sư
- Login/Signup 2 tab, phân nhánh role trong App.js
- Admin login chung trang student, vào Profile → nút "Trang quản trị"

### Student
- Splash, Auth, Home (list gia sư Supabase + search), Chi tiết gia sư
- Booking: 10/20/30 buổi + discount + lịch + PTTT 100%/50%
- Payment: STK ACB + mã EDT + countdown → tạo course + order
- Khóa học: list từ Supabase
- Thông báo (placeholder), Profile

### Tutor (mock data)
- Lịch dạy, Học sinh, Ví, Profile

### Admin
- Dashboard (stats thật), Users (đổi role + khoá), Courses, Profile

## CÒN LẠI
**Ưu tiên cao:**
- Chi tiết khóa học cho HS: list buổi, xác nhận từng buổi, đánh giá 1-5 sao
- Trang tutor dùng data thật (lịch dạy, ví từ Supabase)
- Admin duyệt order → course status=active
- Tạo sessions khi course active (chia theo lịch)
- Upload bill thật (Supabase Storage)
- Ví gia sư: cộng tiền khi HS xác nhận, trừ hoa hồng

**Trung bình:**
- ACB auto-match (đang lỗi 403)
- Push notification nhắc giờ học
- Chat HS ↔ gia sư
- Form rút tiền + khiếu nại

**Thấp:**
- Hash password (bcrypt)
- Đổi icon + splash, build APK
- eKYC CCCD gia sư

## QUY ƯỚC CODE
- Màu: #2563EB (HS), #7C3AED (admin)
- SafeAreaView từ `react-native-safe-area-context`, KHÔNG dùng từ `react-native`
- StyleSheet.create ở cuối file
- UI tiếng Việt, comment tiếng Anh
- Giá: số nguyên VND, hiển thị `.toLocaleString('vi-VN')`

## QUY TRÌNH
1. Termux session 1: `cd ~/projects/EduTeach && npx expo start`
2. Termux session 2: `cd ~/backend-eduteach && node server.js` (nếu cần)
3. Test trên Expo Go qua QR
4. Push: `git add . && git commit -m "..." && git push`

## LƯU Ý CHO CHAT MỚI
- Chủ dự án: Hồ Văn Hoà - vibe coder, KHÔNG có máy tính, code 100% trên Termux Android
- Không hỏi lại tech stack/database/cấu trúc - đã có trong README
- User thích ngắn gọn, tui trả lời có structure (heading, bullet, code block)
- Đưa code dài: dùng `cat > file.js << 'EOF' ... EOF` để paste 1 lần
- Nhắc user KHÔNG bấm Ctrl+C khi đang paste heredoc
- Khi tạo file trong folder mới: `mkdir -p` trước

## LINKS
- GitHub: https://github.com/vanhoa282/EduTeach
- Supabase: https://supabase.com/dashboard

---
Last update: 2026-10-05 | Version: MVP 0.5
