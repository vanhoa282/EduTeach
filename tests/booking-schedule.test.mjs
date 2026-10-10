import assert from 'node:assert/strict';
import {
  generateAvailableSessions,
  overlaps,
  filterOccupiedSlots
} from '../lib/booking/schedule.js';

const slots = {
  '3': [8],
  '4': [8],
  '5': [8],
  '6': [10],
  '0': [10]
};

const fromDate = new Date('2026-10-06T00:00:00+07:00');

const sessions = generateAvailableSessions(
  slots,
  10,
  fromDate
);

assert.equal(sessions.length, 10);

assert.equal(
  sessions[0].start_at,
  '2026-10-07T01:00:00.000Z'
);

assert.equal(
  sessions[0].end_at,
  '2026-10-07T03:00:00.000Z'
);

// Lịch đã được đặt: thứ Tư, 8h-10h.
const occupied = [sessions[0]];

const remaining = filterOccupiedSlots(
  sessions,
  occupied
);

assert.equal(remaining.length, 9);
assert.equal(
  remaining.some(
    x => x.start_at === occupied[0].start_at
  ),
  false
);

// Kiểm tra giờ bắt đầu khác nhau nhưng vẫn trùng.
assert.equal(
  overlaps(
    {
      start_at: '2026-10-07T01:00:00Z',
      end_at: '2026-10-07T03:00:00Z'
    },
    {
      start_at: '2026-10-07T02:00:00Z',
      end_at: '2026-10-07T04:00:00Z'
    }
  ),
  true
);

// Hai buổi sát nhau không bị tính là trùng.
assert.equal(
  overlaps(
    {
      start_at: '2026-10-07T01:00:00Z',
      end_at: '2026-10-07T03:00:00Z'
    },
    {
      start_at: '2026-10-07T03:00:00Z',
      end_at: '2026-10-07T05:00:00Z'
    }
  ),
  false
);

console.log('PASS: Tao 10 buoi theo lich gia su');
console.log('PASS: Dung mui gio Viet Nam');
console.log('PASS: Loai bo gio da duoc dat');
console.log('PASS: Phat hien lich chong lan');
console.log('PASS: Cho phep hai buoi sat nhau');
console.log('ALL BOOKING TESTS PASSED');
