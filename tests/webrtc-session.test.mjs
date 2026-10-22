import assert from 'node:assert/strict';
import {
  ICE_SERVERS,
  signalingChannelName,
  isOfferer,
  isParticipant,
  newOfferId,
  nextReconnectDelay,
  MAX_RECONNECT_ATTEMPTS,
  buildIceServers,
  hasTurnRelay,
  getJoinWindow,
  getSessionTimes,
} from '../lib/webrtc/session.js';

// Gia sư luôn là offerer → không bị xung đột khi 2 bên cùng vào phòng.
assert.equal(isOfferer({ role: 'tutor' }), true);
assert.equal(isOfferer({ role: 'student' }), false);

// Chỉ HS + gia sư của buổi được vào.
const session = {
  id: '11111111-1111-1111-1111-111111111111',
  course: {
    student_id: 'student-1',
    tutor_id: 'tutor-1',
    subject: 'Toán',
  },
};
assert.equal(isParticipant({ id: 'student-1' }, session), true);
assert.equal(isParticipant({ id: 'tutor-1' }, session), true);
assert.equal(isParticipant({ id: 'nguoi-la' }, session), false);

// Fallback: ID nằm trực tiếp trên session (không qua course) vẫn nhận.
assert.equal(
  isParticipant({ id: 'student-1' }, { id: 's2', student_id: 'student-1', tutor_id: 'tutor-1' }),
  true
);

// FAIL-CLOSED: session không xác định được HS/gia sư nào → ai cũng bị từ chối.
// (Bản cũ trả true ở ca này — đã sửa.)
assert.equal(isParticipant({ id: 'student-1' }, { ...session, course: null }), false);
assert.equal(isParticipant({ id: 'student-1' }, { id: 's3' }), false);
assert.equal(isParticipant(null, session), false);
assert.equal(isParticipant({ id: 'student-1' }, null), false);

// Channel signaling theo session.
assert.equal(
  signalingChannelName('abc-123'),
  'signaling:session:abc-123'
);

// ICE mặc định: STUN + TURN (TURN_CONFIG đã cấu hình Metered 2026-10-22).
assert.equal(Array.isArray(ICE_SERVERS), true);
assert.equal(ICE_SERVERS.length, 2);
assert.equal(typeof ICE_SERVERS[0].urls[0], 'string');
assert.equal(hasTurnRelay(), true);
// Chưa cấu hình TURN (config rỗng) → chỉ STUN.
assert.equal(buildIceServers({ urls: [], username: '', credential: '' }).length, 1);

// Có TURN_CONFIG hợp lệ → thêm 1 entry TURN, hasTurnRelay() = true.
const withTurn = buildIceServers({
  urls: ['turn:turn.example.com:3478?transport=udp'],
  username: 'eduteach',
  credential: 'secret',
});
assert.equal(withTurn.length, 2);
assert.equal(withTurn[1].username, 'eduteach');
// TURN thiếu username → không thêm (tránh ICE lỗi vô ích).
assert.equal(buildIceServers({ urls: ['turn:x:3478'], username: '' }).length, 1);

// offer_id luôn duy nhất.
assert.notEqual(newOfferId(), newOfferId());

// Backoff reconnect: 3s → 6s → 12s → 24s → 30s cap.
assert.equal(nextReconnectDelay(0), 3000);
assert.equal(nextReconnectDelay(1), 6000);
assert.equal(nextReconnectDelay(2), 12000);
assert.equal(nextReconnectDelay(3), 24000);
assert.equal(nextReconnectDelay(4), 30000);
assert.equal(nextReconnectDelay(100), 30000);
assert.equal(MAX_RECONNECT_ATTEMPTS, 6);

// Cửa sổ vào lớp dùng chung: mở -15', đóng +30' sau khi kết thúc (mặc định 2h).
const startMs = Date.parse('2030-01-01T03:00:00.000Z');
const classSession = { id: 's4', scheduled_at: '2030-01-01T03:00:00.000Z' };
assert.equal(getSessionTimes(classSession).end.getTime(), startMs + 2 * 3600000);
assert.equal(getJoinWindow(classSession, startMs - 16 * 60000).open, false); // sớm quá
assert.equal(getJoinWindow(classSession, startMs - 15 * 60000).open, true);  // đúng lúc mở
assert.equal(getJoinWindow(classSession, startMs + 60 * 60000).open, true);   // đang học
assert.equal(getJoinWindow(classSession, startMs + 150 * 60000).open, true);  // cuối cửa sổ +30'
assert.equal(getJoinWindow(classSession, startMs + 151 * 60000).open, false); // đã đóng
assert.equal(getJoinWindow({ id: 's5' }, startMs).open, false);               // chưa xếp lịch

console.log('PASS: Gia su la offerer, HS la answerer');
console.log('PASS: Chi HS + gia su cua buoi duoc vao phong');
console.log('PASS: Channel signaling theo session');
console.log('PASS: Backoff reconnect dung cap');
console.log('ALL WEBRTC SESSION TESTS PASSED');
