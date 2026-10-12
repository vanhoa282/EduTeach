// EduTeach WebRTC — pure helpers.
// KHÔNG import react-native / supabase để chạy được unit test bằng node.

// STUN công cộng: chỉ giúp tìm IP công khai, KHÔNG truyền media qua máy chủ nào.
// Với mạng CGNAT nghiêm ngặt có thể cần TURN tự host (coturn) — cấu hình thêm tại đây.
export const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
];

export function signalingChannelName(sessionId) {
  return 'signaling:session:' + sessionId;
}

// Gia sư luôn là người gửi offer → tránh xung đột khi 2 bên cùng gọi.
export function isOfferer(user) {
  return (user?.role || '') === 'tutor';
}

// Chỉ HS + gia sư của buổi đó được vào phòng.
export function isParticipant(user, session) {
  const uid = user?.id;
  const course = session?.course || {};
  const studentId = course.student_id || session.student_id;
  const tutorId = course.tutor_id || session.tutor_id;

  if (studentId && tutorId) return uid === studentId || uid === tutorId;
  if (studentId) return uid === studentId;
  if (tutorId) return uid === tutorId;
  return true;
}

export function newOfferId() {
  return (
    'offer-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10)
  );
}

// Backoff khi mất kết nối: 3s → 6s → 12s → 24s → 30s (cap)
export function nextReconnectDelay(attempt) {
  return Math.min(3000 * 2 ** Math.min(attempt, 4), 30000);
}

export const MAX_RECONNECT_ATTEMPTS = 6;
