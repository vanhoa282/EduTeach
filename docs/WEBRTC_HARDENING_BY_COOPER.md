# WebRTC hardening — Cooper bổ sung trực tiếp trên máy (2026-10-22)

Đối chiếu bản native TRÊN MÁY (commit 694fba4 + thay đổi chưa commit) với
audit phòng học. Bản trên máy đã có sẵn: màn hình native trong
ClassroomScreen.js, foreground service, chia sẻ màn hình, reconnect
backoff, đổi camera. Các phần DƯỚI ĐÂY là phần còn thiếu, đã bổ sung:

## Đã bổ sung
1. `lib/webrtc/session.js` (viết lại, tương thích ngược mọi import cũ)
   - `isParticipant` FAIL-CLOSED: session thiếu ID là từ chối (bản cũ cho qua).
   - `TURN_CONFIG` + `buildIceServers()` + `hasTurnRelay()`: chỗ điền TURN
     (trước đây chỉ STUN — nguyên nhân không ổn định qua 4G CGNAT).
   - `getJoinWindow()` / `getSessionTimes()`: cửa sổ vào lớp dùng chung.
2. `lib/webrtc/signaling.js` (viết lại, giữ nguyên chữ ký hàm cũ)
   - Ưu tiên RPC bảo mật SQL 08 (xác thực token phiên đăng nhập, server tự
     ghi sender_id), tự fallback về bảng thẳng khi chưa chạy SQL 08.
   - Polling 2.5s → 1.2s (sau SQL 08, realtime bị RLS chặn nên polling là chính).
3. `screens/ClassroomScreen.js` (chỉnh tối thiểu, không đổi luồng cũ)
   - Tự kiểm tra cửa sổ giờ ngay trong phòng (cả UI lẫn effect khởi tạo peer).
   - Bổ sung UI CHAT trong phòng: peer/data channel đã có sẵn mà chưa có UI —
     nay có nút Chat, panel tin nhắn, gửi/nhận qua data channel.
4. `supabase/sql/08_webrtc_signaling_hardened.sql` (MỚI) — gỡ policy
   USING(true) của SQL 04, khoá client chạm thẳng vào bảng signaling,
   2 RPC SECURITY DEFINER kiểm tra token + đúng người của buổi học.
5. `deploy/coturn/` (MỚI) — docker-compose + turnserver.conf + README
   dựng TURN server.
6. `tests/webrtc-session.test.mjs` — cập nhật theo hành vi mới + test TURN
   + test cửa sổ giờ.

Backup trước khi sửa: `~/eduteach-backups/cooper-20261022/`
(session.js, signaling.js, ClassroomScreen.js, test file + git status/log).

## Việc còn lại (cần làm tay)
1. Supabase SQL Editor: chạy SQL 04 (nếu chưa) → chạy SQL 08.
2. Dựng TURN theo deploy/coturn/README.md → điền TURN_CONFIG trong
   lib/webrtc/session.js → test trickle-ice thấy candidate `relay`.
3. Build lại APK (bản trên máy đã có android/ + plugins foreground):
   kiểm tra bằng 2 máy thật theo ma trận: cùng Wi-Fi / khác mạng 4G /
   rớt mạng giữa buổi / share màn hình / chat 2 chiều / tài khoản lạ bị chặn.
