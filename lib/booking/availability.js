import { supabase } from '../supabase';
import { selectNonOverlappingSessions } from './selectSessions';
import {
  generateCandidateSessions,
  filterOccupiedSlots,
  overlaps,
} from './schedule';

// Backend trả occupied từ locks + sessions (không lộ thông tin HS).
// App không truy cập trực tiếp booking_slot_locks.
export async function getOccupiedSlots(tutorId, from, to) {
  if (!tutorId || !from || !to) {
    throw new Error('Thiếu thông tin kiểm tra lịch');
  }

  const { data, error } = await supabase.functions.invoke(
    'booking-availability',
    {
      body: {
        tutor_id: tutorId,
        from,
        to,
      },
    }
  );

  if (error) {
    throw new Error(
      'Chưa kết nối được dịch vụ kiểm tra lịch. Vui lòng thử lại sau.'
    );
  }

  if (!Array.isArray(data?.occupied)) {
    throw new Error('Dữ liệu lịch từ máy chủ không hợp lệ');
  }

  return data.occupied;
}

// Danh sách khung giờ trống để học sinh tự chọn (không xếp tự động).
export async function listFreeSlots(
  tutorId,
  availableSlots,
  fromDate = new Date(),
  maxDays = 90
) {
  const candidates = generateCandidateSessions(
    availableSlots,
    fromDate,
    maxDays
  );

  if (candidates.length === 0) {
    return [];
  }

  const occupied = await getOccupiedSlots(
    tutorId,
    candidates[0].start_at,
    candidates[candidates.length - 1].end_at
  );

  return filterOccupiedSlots(candidates, occupied);
}

export function validateSelectedSlots(selected, freeSlots, count) {
  if (![10, 20, 30].includes(count)) {
    throw new Error('Số buổi phải là 10, 20 hoặc 30');
  }

  if (!Array.isArray(selected) || selected.length !== count) {
    throw new Error(`Bạn cần chọn đúng ${count} buổi`);
  }

  const freeKeys = new Set(
    (freeSlots || []).map(s => `${s.start_at}|${s.end_at}`)
  );

  const seen = new Set();
  for (const slot of selected) {
    const key = `${slot.start_at}|${slot.end_at}`;
    if (!freeKeys.has(key)) {
      throw new Error('Có khung giờ vừa hết chỗ. Chọn lại lịch trống.');
    }
    if (seen.has(key)) {
      throw new Error('Không chọn trùng một khung giờ');
    }
    seen.add(key);
  }

  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      if (overlaps(selected[i], selected[j])) {
        throw new Error('Các buổi đã chọn bị chồng giờ');
      }
    }
  }

  return [...selected].sort(
    (a, b) => Date.parse(a.start_at) - Date.parse(b.start_at)
  );
}

// Giữ lại cho test / fallback nội bộ — UI chính dùng listFreeSlots.
export async function getAvailableSessions(
  tutorId,
  availableSlots,
  count = 10,
  fromDate = new Date()
) {
  if (![10, 20, 30].includes(count)) {
    throw new Error('Số buổi không hợp lệ');
  }

  const candidates = generateCandidateSessions(
    availableSlots,
    fromDate,
    180
  );

  if (candidates.length < count) {
    throw new Error('Gia sư không có đủ lịch rảnh');
  }

  const occupied = await getOccupiedSlots(
    tutorId,
    candidates[0].start_at,
    candidates[candidates.length - 1].end_at
  );

  return selectNonOverlappingSessions(
    availableSlots,
    occupied,
    count,
    fromDate
  );
}
