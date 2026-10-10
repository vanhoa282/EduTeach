import {
  generateCandidateSessions,
  overlaps,
} from './schedule.js';

export function selectNonOverlappingSessions(
  availableSlots,
  occupiedSlots = [],
  count = 10,
  fromDate = new Date(),
) {
  if (![10, 20, 30].includes(count)) {
    throw new Error('Số buổi phải là 10, 20 hoặc 30');
  }

  const candidates = generateCandidateSessions(
    availableSlots,
    fromDate,
    180,
  );

  const selected = [];

  for (const candidate of candidates) {
    // Không chọn giờ đã được học viên khác giữ hoặc đặt.
    if (occupiedSlots.some(slot => overlaps(candidate, slot))) {
      continue;
    }

    // Không cho các buổi trong cùng một đơn chồng lên nhau.
    if (selected.some(slot => overlaps(candidate, slot))) {
      continue;
    }

    selected.push(candidate);

    if (selected.length === count) {
      return selected;
    }
  }

  throw new Error(
    `Gia sư chỉ còn ${selected.length}/${count} buổi phù hợp trong 180 ngày`,
  );
}
