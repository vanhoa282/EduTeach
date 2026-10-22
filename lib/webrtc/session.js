// EduTeach WebRTC — pure helpers.
// KHÔNG import react-native / supabase để chạy được unit test bằng node.

// ── ICE: STUN + TURN ─────────────────────────────────────────────────────────
// STUN công cộng: chỉ giúp tìm IP công khai, KHÔNG relay media.
// Mạng di động VN hay dùng CGNAT nghiêm ngặt → 2 máy không thấy nhau qua
// STUN là chuyện thường. MUỐN PHÒNG HỌC NATIVE ỔN ĐỊNH PHẢI CÓ TURN.
// Cách bật TURN (xem deploy/coturn/README.md):
//   1) Dựng coturn trên VPS (docker có sẵn trong deploy/coturn/).
//   2) Điền TURN_CONFIG bên dưới (hoặc dùng TURN tĩnh của nhà cung cấp).
// TURN credential tĩnh chỉ là phương án dev — production nên cấp credential
// ngắn hạn từ server (coturn REST API / use-auth-secret), đừng để lộ secret
// dài hạn trong app phát hành.
export const TURN_CONFIG = {
  urls: ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:80?transport=tcp', 'turn:global.relay.metered.ca:443', 'turns:global.relay.metered.ca:443?transport=tcp'],
  username: '5f950834080ab8242234ea33',
  credential: 'AYBHnwSXyhd2Rloh',
};

export function buildIceServers(turn = TURN_CONFIG) {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  if (turn && Array.isArray(turn.urls) && turn.urls.length > 0 && turn.username) {
    servers.push({
      urls: turn.urls,
      username: turn.username,
      credential: turn.credential || '',
    });
  }
  return servers;
}

export const ICE_SERVERS = buildIceServers();

export function hasTurnRelay() {
  return ICE_SERVERS.some(
    (s) => (Array.isArray(s.urls) ? s.urls : [s.urls]).some(
      (u) => typeof u === 'string' && u.startsWith('turn')
    )
  );
}

export function signalingChannelName(sessionId) {
  return 'signaling:session:' + sessionId;
}

// Gia sư luôn là người gửi offer → tránh xung đột khi 2 bên cùng gọi.
export function isOfferer(user) {
  return (user?.role || '') === 'tutor';
}

// Chỉ HS + gia sư của buổi đó được vào phòng.
// FAIL-CLOSED: không xác định được danh tính (thiếu user id, hoặc session
// không có cả student_id lẫn tutor_id ở bất kỳ nguồn nào) → TỪ CHỐI.
// (Bản cũ trả `true` khi thiếu ID — ai cũng vào được phòng thiếu dữ liệu.)
export function isParticipant(user, session) {
  const uid = user?.id;
  if (!uid || !session) return false;
  const course = session?.course || {};
  const studentId = course.student_id || session.student_id || null;
  const tutorId = course.tutor_id || session.tutor_id || null;
  if (!studentId && !tutorId) return false;
  return uid === studentId || uid === tutorId;
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

// ── Cửa sổ vào lớp (DÙNG CHUNG cho mọi màn hình) ─────────────────────────────
// Mở 15 phút trước giờ học, đóng 30 phút sau khi kết thúc.
// Trước đây logic này bị viết lại 3 nơi khác nhau (CourseDetailScreen,
// tutor/ScheduleScreen, và ClassroomScreen thì không có) — nay gom về 1 chỗ
// và ClassroomScreen TỰ kiểm tra lại khi mở phòng.
export const JOIN_OPEN_BEFORE_MS = 15 * 60 * 1000;
export const JOIN_CLOSE_AFTER_MS = 30 * 60 * 1000;
export const DEFAULT_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

export function getSessionTimes(session) {
  const startRaw = session?.scheduled_start || session?.scheduled_at;
  if (!startRaw) return null;
  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) return null;
  const endRaw = session?.scheduled_end;
  let end = endRaw ? new Date(endRaw) : new Date(start.getTime() + DEFAULT_SESSION_DURATION_MS);
  if (Number.isNaN(end.getTime()) || end <= start) {
    end = new Date(start.getTime() + DEFAULT_SESSION_DURATION_MS);
  }
  return { start, end };
}

export function getJoinWindow(session, nowMs = Date.now()) {
  const times = getSessionTimes(session);
  if (!times) {
    return { open: false, opensAt: null, closesAt: null, hint: 'Buổi học chưa được xếp lịch' };
  }
  const opensAt = times.start.getTime() - JOIN_OPEN_BEFORE_MS;
  const closesAt = times.end.getTime() + JOIN_CLOSE_AFTER_MS;
  if (nowMs < opensAt) {
    return {
      open: false,
      opensAt,
      closesAt,
      hint: 'Phòng học mở lúc ' + new Date(opensAt).toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
      }),
    };
  }
  if (nowMs > closesAt) {
    return { open: false, opensAt, closesAt, hint: 'Buổi học đã kết thúc' };
  }
  return { open: true, opensAt, closesAt, hint: '' };
}
