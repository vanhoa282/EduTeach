import assert from 'node:assert/strict';
import {
  ICE_SERVERS,
  signalingChannelName,
  isOfferer,
  isParticipant,
  newOfferId,
  nextReconnectDelay,
  MAX_RECONNECT_ATTEMPTS,
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

// Fallback khi session không có course.
assert.equal(isParticipant({ id: 'student-1' }, { ...session, course: null }), true);

// Channel signaling theo session.
assert.equal(
  signalingChannelName('abc-123'),
  'signaling:session:abc-123'
);

// ICE servers chỉ dùng STUN (không relay media qua bên thứ 3).
assert.equal(Array.isArray(ICE_SERVERS), true);
assert.equal(ICE_SERVERS.length, 1);
assert.equal(typeof ICE_SERVERS[0].urls[0], 'string');

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

console.log('PASS: Gia su la offerer, HS la answerer');
console.log('PASS: Chi HS + gia su cua buoi duoc vao phong');
console.log('PASS: Channel signaling theo session');
console.log('PASS: Backoff reconnect dung cap');
console.log('ALL WEBRTC SESSION TESTS PASSED');
