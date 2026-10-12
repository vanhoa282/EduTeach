// Cấu hình máy chủ Jitsi cho phòng học.
// KHI CÓ MÁY CHỦ RIÊNG (xem docs/SELF_HOST_JITSI.md):
// đặt domain của bạn LÊN ĐẦU MẢNG, vd:
//   export const JITSI_DOMAINS = ['meet.tenban.com', 'framatalk.org', 'meet.ffmuc.net'];
// App dùng máy chủ đầu tiên; nút "Đổi máy chủ" trong phòng học sẽ xoay vòng
// qua các máy chủ dự phòng nếu máy đang dùng không kết nối được.
export const JITSI_DOMAINS = [
  'framatalk.org',
  'meet.jit.si',
  'meet.ffmuc.net',
];
