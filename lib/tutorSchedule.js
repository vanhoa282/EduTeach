import { supabase } from './supabase';

// Lấy lịch rảnh của tutor
export async function getMySlots(tutorId) {
  const { data } = await supabase
    .from('tutor_profiles')
    .select('available_slots')
    .eq('user_id', tutorId)
    .maybeSingle();
  return data?.available_slots || {};
}

// Lưu lịch rảnh
export async function saveMySlots(tutorId, slots) {
  const { data: existing } = await supabase
    .from('tutor_profiles')
    .select('user_id')
    .eq('user_id', tutorId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('tutor_profiles')
      .update({ available_slots: slots })
      .eq('user_id', tutorId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('tutor_profiles')
      .insert({ user_id: tutorId, available_slots: slots });
    if (error) return { error: error.message };
  }
  return { ok: true };
}

// Bật/tắt nhận lớp
export async function toggleAvailable(tutorId, isAvailable) {
  const { error } = await supabase
    .from('users')
    .update({ is_available: isAvailable })
    .eq('id', tutorId);
  if (error) return { error: error.message };
  return { ok: true };
}

export const DAYS = [
  { key: '1', label: 'T2' },
  { key: '2', label: 'T3' },
  { key: '3', label: 'T4' },
  { key: '4', label: 'T5' },
  { key: '5', label: 'T6' },
  { key: '6', label: 'T7' },
  { key: '0', label: 'CN' },
];

export const HOURS = [8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21];

export function formatSlots(slots) {
  if (!slots || Object.keys(slots).length === 0) return 'Chưa set lịch';
  const lines = [];
  for (const day of DAYS) {
    const hours = slots[day.key];
    if (hours && hours.length > 0) {
      const sorted = [...hours].sort((a, b) => a - b);
      // Nhóm giờ liên tiếp
      const ranges = [];
      let start = sorted[0];
      let prev = sorted[0];
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === prev + 1) { prev = sorted[i]; }
        else { ranges.push([start, prev]); start = sorted[i]; prev = sorted[i]; }
      }
      ranges.push([start, prev]);
      const str = ranges.map(([a, b]) => a === b ? `${a}h` : `${a}-${b + 1}h`).join(', ');
      lines.push(`${day.label}: ${str}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : 'Chưa set lịch';
}
