import assert from 'node:assert/strict';
import { selectNonOverlappingSessions } from '../lib/booking/selectSessions.js';
import { overlaps } from '../lib/booking/schedule.js';

const schedule = {
  '1': [8, 9, 10],
  '3': [8, 9, 10],
  '5': [8, 9, 10],
};

const selected = selectNonOverlappingSessions(
  schedule,
  [],
  10,
  new Date('2026-10-08T00:00:00.000Z'),
);

assert.equal(selected.length, 10);

for (let i = 0; i < selected.length; i++) {
  for (let j = i + 1; j < selected.length; j++) {
    assert.equal(
      overlaps(selected[i], selected[j]),
      false,
      `Buổi ${i + 1} trùng buổi ${j + 1}`,
    );
  }
}

console.log('PASS: 10 buoi khong trung nhau');

const occupied = [selected[0], selected[1]];

const next = selectNonOverlappingSessions(
  schedule,
  occupied,
  10,
  new Date('2026-10-08T00:00:00.000Z'),
);

assert.equal(next.length, 10);

for (const slot of next) {
  assert.equal(
    occupied.some(busy => overlaps(slot, busy)),
    false,
  );
}

console.log('PASS: Bo qua buoi da co nguoi dat');
console.log('ALL NO-OVERLAP TESTS PASSED');
