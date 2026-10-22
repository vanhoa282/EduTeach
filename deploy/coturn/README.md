# TURN server (coturn) — vì sao phòng học native cần nó

## Vấn đề
WebRTC 2 máy tự tìm đường tới nhau bằng STUN. Mạng di động VN (và nhiều
Wi-Fi trường học/công ty) dùng CGNAT nghiêm ngặt: STUN lấy được địa chỉ
nhưng 2 máy vẫn không bắt tay được → không hình, không tiếng, dù code đúng.
Đó là nguyên nhân bản native trước đây "không ổn định trên máy thật".

TURN là máy chủ relay dự phòng: khi 2 máy không nối thẳng được, media đi
qua TURN. Có TURN, tỉ lệ kết nối thành công mới tiệm cận mức dùng được.

## Cách dựng (trên VPS)
1. Trỏ bản ghi A: `turn.<domain của bạn>` → IP VPS.
2. Mở firewall: `3478 udp+tcp`, `5349 tcp`, `49152-65535 udp`.
3. Sửa `turnserver.conf`: `realm`, `server-name`, `user` (mật khẩu ngẫu nhiên dài).
4. `docker compose up -d` rồi kiểm tra log: `docker compose logs -f`.
5. Test tại https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
   với server `turn:turn.<domain>:3478`, user/credential đã đặt → phải thấy
   candidate type `relay`.

## Nối vào app
Điền `TURN_CONFIG` trong `lib/webrtc/session.js`:

```js
export const TURN_CONFIG = {
  urls: ['turn:turn.tenban.com:3478?transport=udp', 'turns:turn.tenban.com:5349?transport=tcp'],
  username: 'eduteach',
  credential: '<mật khẩu đã đặt>',
};
```

## Lưu ý production
- User tĩnh trong app = ai giải nén APK cũng lấy được. Chấp nhận được ở
  giai đoạn thử nghiệm nội bộ; khi phát hành thật, chuyển sang
  `use-auth-secret` của coturn và cấp credential ngắn hạn (hết hạn theo giờ)
  từ Edge Function — không nhúng secret dài hạn vào app.
- TURN tốn băng thông VPS theo lượng media relay. Lớp 1-1 640×480 thì nhẹ;
  theo dõi `docker stats` khi số lớp tăng.
