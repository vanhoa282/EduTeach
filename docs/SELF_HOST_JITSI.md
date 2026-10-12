# 🎥 Tự host máy chủ Jitsi Meet riêng cho EduTeach

Máy chủ riêng = KHÔNG đăng nhập Google, KHÔNG phụ thuộc meet.jit.si, có sẵn:
2 khung hiện cả 2 người, chia sẻ màn hình, chat, bật/tắt mic-cam, fullscreen.
Phòng học của app sẽ tự dùng máy chủ của bạn sau khi xong 2 bước cuối.

## 1. Thuê VPS (khuyên dùng)

| Nhà cung cấp | Cấu hình | Giá |
|---|---|---|
| **Oracle Cloud Free Tier** | ARM 4 vCPU + 24GB RAM | **0đ (vĩnh viễn)** ← khuyên dùng |
| Hetzner CX22 | 2 vCPU + 4GB | ~4€/tháng |
| Vultr / DigitalOcean | 4GB RAM | ~24$/tháng |

Yêu cầu tối thiểu: 4GB RAM, Ubuntu 22.04/24.04, IP công khai.
Mở port trên firewall (cả ở VPS panel lẫn ufw): **80, 443 (tcp), 10000 (udp+tcp), 5349 (tcp), 4445 (udp+tcp)**.

## 2. Tên miền (cần cho HTTPS — WebView chỉ chấp nhận chứng chỉ hợp lệ)

- Có domain: tạo bản ghi **A**: `meet.tenban.com → IP VPS` và `turn.tenban.com → IP VPS`
- Chưa có: dùng **duckdns.org** (miễn phí): tạo 2 subdomain `tenban.duckdns.org` + `tenban-turn.duckdns.org` trỏ về IP VPS

## 3. Cài Docker trên VPS

```bash
curl -fsSL https://get.docker.com | sh
```

## 4. Cấu hình + chạy

```bash
# Trên VPS:
mkdir -p ~/jitsi && cd ~/jitsi
# Tải 2 file trong repo: deploy/jitsi/docker-compose.yml + deploy/jitsi/.env.example
# (hoặc copy nội dung bằng nano/vi)
cp .env.example .env
nano .env   # sửa: tên miền, email, 5 MẬT KHẨU (openssl rand -hex 16)
docker compose up -d
docker compose logs -f --tail=50   # theo dõi khởi động
````

Kiểm tra: mở trình duyệt `https://meet.tenban.com/abc123` → thấy trang Jitsi là xong.
(Không cần đăng nhập gì — khách vào thẳng.)

## 5. (Tuỳ chọn) Bật login nội bộ — "hệ thống login sẵn"

Trong `.env` sửa: `ENABLE_AUTH=1`, `ENABLE_GUESTS=0`, `AUTH_TYPE=internal`
rồi `docker compose up -d` và tạo tài khoản:

```bash
docker compose exec prosody prosodyctl --config /config/prosody.cfg.lua register gia_su meet.tenban.com PASSWORD123
docker compose exec prosody prosodyctl --config /config/prosody.cfg.lua register hoc_sinh meet.tenban.com PASSWORD123
```

(Để MVP nhanh: cứ để khách tự do — room name là UUID của buổi học, không ai đoán được.)

## 6. Trỏ app về máy chủ riêng

Mở file `lib/jitsiConfig.js` trong repo app và đặt domain của bạn **LÊN ĐẦU MẢNG**:

```js
export const JITSI_DOMAINS = [
  'meet.tenban.com',      // ← máy chủ riêng của bạn
  'framatalk.org',
  'meet.ffmuc.net',
];
```

Reload app → vào phòng học → header hiện "Máy chủ: meet.tenban.com" → test 2 máy.

## Xử lý sự cố nhanh

| Triệu chứng | Xử lý |
|---|---|
| Không ra trang web | Kiểm tra bản ghi DNS + mở port 80/443 + `docker compose ps` |
| Không có chứng chỉ | Xem log web: `docker compose logs web`; chờ Let's Encrypt vài phút |
| Nghe/ thấy được 1 chiều | Kiểm tra port 10000/udp + TURN đã bật (coturn container chạy) |
| App báo lỗi kết nối | Bấm nút "Đổi máy chủ" trong phòng học để thử domain khác |
