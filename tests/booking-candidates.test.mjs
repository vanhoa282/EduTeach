import assert from 'node:assert/strict';
import {
  generateCandidateSessions,
  filterOccupiedSlots
} from '../lib/booking/schedule.js';

const weekly = {
  '3': [8],
  '4': [8],
  '5': [8],
  '6': [10],
  '0': [10]
};

const candidates = generateCandidateSessions(
  weekly,
  new Date('2026-10-06T00:00:00+07:00'),
  90
);

assert.ok(candidates.length > 30);

// Giả lập 30 buổi đầu đã có người đặt.
const occupied = candidates.slice(0, 30);

const remaining = filterOccupiedSlots(
  candidates,
  occupied
);

assert.ok(remaining.length >= 10);

assert.equal(
  remaining[0].start_at,
  candidates[30].start_at
);

console.log('PASS: Tao hon 30 khung gio');
console.log('PASS: Bo qua 30 buoi da dat');
console.log('PASS: Tim duoc 10 buoi tiep theo');
console.log('ALL CANDIDATE TESTS PASSED');
