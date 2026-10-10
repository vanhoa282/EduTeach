import assert from 'node:assert/strict';
import {
  groupSlotsByDay,
  sameWeekdaySlots,
  slotKey,
  vnPartsFromIso,
} from '../lib/booking/schedule.js';

// Thứ Hai 05/10/2026: 08h VN = 01:00 UTC, 10h VN = 03:00 UTC
// Thứ Ba 06/10/2026: 08h VN = 01:00 UTC
const slots = [
  { start_at: '2026-10-05T01:00:00.000Z', end_at: '2026-10-05T03:00:00.000Z' },
  { start_at: '2026-10-05T03:00:00.000Z', end_at: '2026-10-05T05:00:00.000Z' },
  { start_at: '2026-10-06T01:00:00.000Z', end_at: '2026-10-06T03:00:00.000Z' },
];

// Hai khung giờ CÙNG THỨ khác giờ nằm trong CÙNG một nhóm ngày.
const groups = groupSlotsByDay(slots);
assert.equal(groups.length, 2);
assert.equal(groups[0].slots.length, 2);
assert.equal(groups[0].weekday, 1); // Thứ Hai
assert.equal(groups[1].slots.length, 1);
assert.ok(groups[0].label.includes('05/10'));

// Nút "Thay đổi": slot trống khác cùng thứ, loại trừ slot đang chọn.
const alternatives = sameWeekdaySlots(
  slots,
  1,
  [slotKey(slots[0])],
  []
);
assert.equal(alternatives.length, 1);
assert.equal(alternatives[0].start_at, '2026-10-05T03:00:00.000Z');

// Không đưa ra slot chồng giờ với các buổi còn lại (8h-10h đã bận → chỉ còn 10h-12h).
const busyMorning = [
  { start_at: '2026-10-05T01:00:00.000Z', end_at: '2026-10-05T03:00:00.000Z' },
];
const filtered = sameWeekdaySlots(slots, 1, [], busyMorning);
assert.equal(filtered.length, 1);
assert.equal(filtered[0].start_at, '2026-10-05T03:00:00.000Z');

// Hai buổi sát nhau (8h-10h và 10h-12h) KHÔNG bị coi là chồng giờ.
const parts8h = vnPartsFromIso('2026-10-05T01:00:00.000Z');
assert.equal(parts8h.weekday, 1);
assert.equal(parts8h.hour, 8);

console.log('PASS: Gom nhom slot theo ngay VN');
console.log('PASS: Cho phep 2 khung gio cung thu, khac gio');
console.log('PASS: Nut Thay doi loc dung slot cung thu');
console.log('PASS: Loai slot chong gio voi buoi con lai');
console.log('ALL CHANGE-SLOT TESTS PASSED');
