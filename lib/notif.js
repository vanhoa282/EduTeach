import { supabase } from './supabase';

// Tạo thông báo
export async function createNotification({ userId, title, body, type = 'system', refId = null }) {
  if (!userId) return;
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body,
    type,
    ref_id: refId,
  });
  if (error) console.log('createNotification error:', error.message);
}

// Lấy notifications của user
export async function getMyNotifications(userId, limit = 50) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// Đếm chưa đọc
export async function getNotifUnreadCount(userId) {
  if (!userId) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count || 0;
}

// Đánh dấu đã đọc
export async function markNotifRead(notifId) {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notifId);
}

// Đánh dấu tất cả đã đọc
export async function markAllNotifRead(userId) {
  if (!userId) return;
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}
