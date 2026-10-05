import { supabase } from './supabase';

// Lấy announcement active (cho user thường)
export async function getActiveAnnouncements(limit = 5) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// Admin: lấy tất cả
export async function adminGetAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { error: error.message };
  return { announcements: data || [] };
}

// Admin: tạo
export async function adminCreateAnnouncement({ title, content, type, expiresAt, userId }) {
  if (!title?.trim()) return { error: 'Tiêu đề bắt buộc' };
  const { error } = await supabase.from('announcements').insert({
    title: title.trim(),
    content: content?.trim() || null,
    type: type || 'info',
    active: true,
    created_by: userId,
    expires_at: expiresAt || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

// Admin: bật/tắt
export async function adminToggleAnnouncement(id, active) {
  const { error } = await supabase
    .from('announcements').update({ active }).eq('id', id);
  if (error) return { error: error.message };
  return { ok: true };
}

// Admin: xoá
export async function adminDeleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) return { error: error.message };
  return { ok: true };
}
