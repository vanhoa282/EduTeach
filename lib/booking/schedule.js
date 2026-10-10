// EduTeach booking schedule utilities.
// Vietnam time UTC+7, fixed 2-hour lessons.
// Pure functions: no database writes.

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const LESSON_MS = 2 * 60 * 60 * 1000;

function vnDateParts(date) {
  const vn = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
    day: vn.getUTCDate(),
    weekday: vn.getUTCDay(),
  };
}

function toUtcMs(year, month, day, hour) {
  return Date.UTC(year, month - 1, day, hour) - VN_OFFSET_MS;
}

export function generateAvailableSessions(
  availableSlots,
  count = 10,
  fromDate = new Date(),
  maxDays = 180
) {
  if (![10, 20, 30].includes(count)) {
    throw new Error('Chỉ hỗ trợ 10, 20 hoặc 30 buổi');
  }

  const result = [];
  const now = fromDate.getTime();

  for (let offset = 0; offset < maxDays; offset++) {
    const date = new Date(now + offset * 86400000);
    const { year, month, day, weekday } = vnDateParts(date);
    const hours = availableSlots?.[String(weekday)] || [];

    for (const hour of [...new Set(hours)].sort((a, b) => a - b)) {
      if (!Number.isInteger(hour) || hour < 0 || hour > 21) {
        continue;
      }

      const start = toUtcMs(year, month, day, hour);
      if (start <= now) continue;

      result.push({
        start_at: new Date(start).toISOString(),
        end_at: new Date(start + LESSON_MS).toISOString(),
      });

      if (result.length === count) return result;
    }
  }

  throw new Error('Gia sư không có đủ lịch rảnh trong khoảng tìm kiếm');
}

export function overlaps(a, b) {
  return (
    new Date(a.start_at).getTime() <
      new Date(b.end_at).getTime() &&
    new Date(b.start_at).getTime() <
      new Date(a.end_at).getTime()
  );
}

export function filterOccupiedSlots(slots, occupied) {
  return slots.filter(
    slot => !occupied.some(item => overlaps(slot, item))
  );
}

// Tạo tất cả khung giờ hợp lệ trong khoảng tìm kiếm.
// Dùng để lọc lịch đã đặt trước khi chọn đủ 10/20/30 buổi.
export function generateCandidateSessions(
  availableSlots,
  fromDate = new Date(),
  maxDays = 180
) {
  if (!(fromDate instanceof Date) ||
      !Number.isFinite(fromDate.getTime())) {
    throw new Error('Ngày bắt đầu không hợp lệ');
  }

  if (!Number.isInteger(maxDays) ||
      maxDays < 1 || maxDays > 365) {
    throw new Error('Khoảng tìm kiếm không hợp lệ');
  }

  const result = [];
  const now = fromDate.getTime();
  const today = vnDateParts(fromDate);
  const firstDayUtc = toUtcMs(
    today.year, today.month, today.day, 0
  );

  for (let offset = 0; offset < maxDays; offset++) {
    const day = new Date(firstDayUtc + offset * 86400000);
    const { year, month, day: date, weekday } = vnDateParts(day);

    const hours = availableSlots?.[String(weekday)] || [];
    if (!Array.isArray(hours)) continue;

    for (const hour of [...new Set(hours)].sort((a, b) => a - b)) {
      if (!Number.isInteger(hour) || hour < 0 || hour > 21) {
        continue;
      }

      const start = toUtcMs(year, month, date, hour);
      if (start <= now) continue;

      result.push({
        start_at: new Date(start).toISOString(),
        end_at: new Date(start + LESSON_MS).toISOString()
      });
    }
  }

  return result;
}

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function slotKey(slot) {
  return `${slot?.start_at}|${slot?.end_at}`;
}

export function vnPartsFromIso(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const vn = new Date(ms + VN_OFFSET_MS);
  return {
    weekday: vn.getUTCDay(),
    hour: vn.getUTCHours(),
    day: vn.getUTCDate(),
    month: vn.getUTCMonth() + 1,
    year: vn.getUTCFullYear(),
  };
}

// Nhãn lịch ngắn cho UI / courses.schedule (không dùng làm nguồn sự thật).
export function summarizeScheduleLabel(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return 'Lịch tự động';

  const counts = new Map();
  for (const slot of slots) {
    const parts = vnPartsFromIso(slot.start_at);
    if (!parts) continue;
    const key = `${parts.weekday}:${parts.hour}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const labels = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([key]) => {
      const [weekday, hour] = key.split(':').map(Number);
      return `${DAY_LABELS[weekday]} ${hour}h-${hour + 2}h`;
    });

  return labels.length > 0
    ? `${labels.join(' · ')} · ${slots.length} buổi`
    : `${slots.length} buổi`;
}

export function formatSlotPreview(slot) {
  const parts = vnPartsFromIso(slot?.start_at);
  if (!parts) return '';
  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month).padStart(2, '0');
  return `${DAY_LABELS[parts.weekday]} ${dd}/${mm} · ${parts.hour}h-${parts.hour + 2}h`;
}

// Nhóm slot theo ngày VN để hiển thị lưới chọn lịch.
// Các khung giờ khác nhau trong cùng một ngày (cùng thứ) nằm cạnh nhau,
// học sinh nhìn thấy và chọn được cả hai nếu muốn.
export function groupSlotsByDay(slots) {
  const map = new Map();

  for (const slot of slots || []) {
    const parts = vnPartsFromIso(slot?.start_at);
    if (!parts) continue;
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        weekday: parts.weekday,
        label: `${DAY_LABELS[parts.weekday]} ${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}`,
        slots: [],
      });
    }
    map.get(key).slots.push(slot);
  }

  const groups = [...map.values()];
  for (const group of groups) {
    group.slots.sort(
      (a, b) => Date.parse(a.start_at) - Date.parse(b.start_at)
    );
  }
  groups.sort(
    (a, b) =>
      Date.parse(a.slots[0].start_at) - Date.parse(b.slots[0].start_at)
  );

  return groups;
}

// Danh sách slot trống CÙNG THỨ (VN) cho nút "Thay đổi".
// - excludeKeys: không đưa lại slot đang chọn / slot đã chọn khác.
// - occupiedRanges: loại các slot chồng giờ với các buổi còn lại.
export function sameWeekdaySlots(
  slots,
  weekday,
  excludeKeys = [],
  occupiedRanges = []
) {
  const excluded = new Set(excludeKeys);
  const occupied = occupiedRanges || [];

  return (slots || []).filter((slot) => {
    if (excluded.has(slotKey(slot))) return false;
    const parts = vnPartsFromIso(slot?.start_at);
    if (!parts || parts.weekday !== weekday) return false;
    if (occupied.some((occ) => overlaps(slot, occ))) return false;
    return true;
  });
}
