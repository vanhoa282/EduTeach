# EduTeach - Atomic Booking Implementation

## Status (2026-10-10)

- Client UI: BookingScreen xếp lịch từ `available_slots` + occupied
- Client create: PaymentScreen gọi `createBooking` → Edge `booking-create`
- Server: RPC `eduteach_create_booking_atomic` giữ chỗ + chống overlap
- Availability: Edge `booking-availability` trả locks + legacy sessions
- SQL dán sẵn: `supabase/sql/02_booking_conflict_ready.sql`

## Deploy checklist

1. Dán SQL `02_booking_conflict_ready.sql` trên Supabase SQL Editor
2. Deploy Edge Functions (JWT Verification OFF):
   - `auth-login`, `auth-logout`, `auth-me`
   - `booking-availability`
   - `booking-create`
3. Học sinh đăng xuất → đăng nhập lại để có `x-eduteach-session`
4. Tutor phải set lịch rảnh trong SetSchedule
5. Test: 2 học sinh cùng giữ 1 khung → người sau nhận lỗi giữ lịch

## Required before production money

1. Trusted server-side student identity via `eduteach_auth_sessions`
2. Never trust client-provided student_id / price
3. One DB transaction: release expired holds → course → order → locks
4. Only verified bank payment marks order paid → sessions from locks
5. Harden RLS: stop broad client inserts into courses/orders once cutover stable
6. Firebase + production keys for Play Store / App Store builds
