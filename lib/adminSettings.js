import { supabase } from './supabase';

// ============ SETTINGS ============
export async function getSettings() {
  const { data } = await supabase.from('settings').select('*');
  const map = {};
  (data || []).forEach(s => { map[s.key] = s.value; });
  return map;
}

export async function updateSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateSettings(map) {
  const rows = Object.entries(map).map(([key, value]) => ({
    key, value: String(value), updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('settings').upsert(rows);
  if (error) return { error: error.message };
  return { ok: true };
}

// ============ DISPUTES ============
export async function adminGetDisputes() {
  const { data, error } = await supabase
    .from('disputes')
    .select(`
      *,
      session:sessions (id, session_number, course_id,
        course:courses (id, subject,
          student:users!courses_student_id_fkey (id, full_name, phone),
          tutor:users!courses_tutor_id_fkey (id, full_name, phone)
        )
      ),
      raised:users!disputes_raised_by_fkey (id, full_name, phone, role)
    `)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { error: error.message };
  return { disputes: data || [] };
}

export async function adminResolveDispute(disputeId, note, action) {
  // action: 'resolved' (đồng ý khiếu nại) | 'rejected' (bác bỏ)
  const { error } = await supabase
    .from('disputes')
    .update({
      status: action,
      resolution_note: note || '',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId);
  if (error) return { error: error.message };
  return { ok: true };
}

// ============ REVENUE STATS ============
export async function adminGetRevenueStats() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  // Tổng doanh thu app (app_fee âm, nên lấy absolute)
  const { data: fees } = await supabase
    .from('transactions')
    .select('amount, created_at')
    .eq('type', 'app_fee')
    .gte('created_at', sixMonthsAgo.toISOString());

  // Tổng đơn đã trả
  const { data: orders } = await supabase
    .from('orders')
    .select('amount, created_at, paid_at')
    .eq('status', 'paid')
    .gte('created_at', sixMonthsAgo.toISOString());

  // Tổng khóa học active
  const { count: coursesCount } = await supabase
    .from('courses').select('id', { count: 'exact', head: true });

  const { count: paidOrdersCount } = await supabase
    .from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid');

  const { count: pendingOrdersCount } = await supabase
    .from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending');

  const { count: disputesCount } = await supabase
    .from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open');

  // Bucket theo tháng
  const buckets = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = { label: `T${d.getMonth() + 1}`, fee: 0, revenue: 0 };
  }

  let totalFee = 0;
  let totalRevenue = 0;

  (fees || []).forEach(tx => {
    const d = new Date(tx.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const val = Math.abs(tx.amount || 0);
    if (buckets[key]) buckets[key].fee += val;
    totalFee += val;
  });

  (orders || []).forEach(o => {
    const d = new Date(o.paid_at || o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets[key]) buckets[key].revenue += o.amount || 0;
    totalRevenue += o.amount || 0;
  });

  return {
    totalFee,
    totalRevenue,
    coursesCount: coursesCount || 0,
    paidOrdersCount: paidOrdersCount || 0,
    pendingOrdersCount: pendingOrdersCount || 0,
    disputesCount: disputesCount || 0,
    monthly: Object.values(buckets),
  };
}
