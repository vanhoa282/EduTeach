// Kiểm tra trạng thái deploy EduTeach trên Supabase (chạy: node tests/check-deploy.mjs)
// Chỉ dùng probe đọc/an toàn (không sửa dữ liệu).
const SUPABASE_URL = 'https://jrkqfalwcleetppqtcvb.supabase.co';
const ANON_KEY = 'sb_publishable_dvrXZVCmpFRnrAjMwTA53g_31nvYNCT';

const H = {
  apikey: ANON_KEY,
  Authorization: 'Bearer ' + ANON_KEY,
  'Content-Type': 'application/json',
};

async function edge(name) {
  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/' + name, {
      method: 'POST',
      headers: { ...H, 'x-client-info': 'deploy-check' },
      body: JSON.stringify({ probe: true }),
    });
    const text = (await res.text()).slice(0, 200);
    if (res.status === 404 && /Function not found|not found/i.test(text)) {
      return { name, status: 'CHƯA DEPLOY ❌', detail: text };
    }
    // Tồn tại function → trả về lỗi nghiệp vụ (400/401/500) chứ không phải 404
    return { name, status: 'ĐÃ DEPLOY ✅', detail: 'HTTP ' + res.status };
  } catch (e) {
    return { name, status: 'LỖI MẠNG ⚠️', detail: e.message };
  }
}

async function rpc(name, args = {}) {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: H,
      body: JSON.stringify(args),
    });
    const text = (await res.text()).slice(0, 300);
    if (res.status === 404 || /PGRST202|Could not find the function/i.test(text)) {
      return { name, status: 'CHƯA CHẠY SQL ❌', detail: text };
    }
    return { name, status: 'ĐÃ CHẠY SQL ✅', detail: text };
  } catch (e) {
    return { name, status: 'LỖI MẠNG ⚠️', detail: e.message };
  }
}

async function table(name) {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + name + '?select=id&limit=1', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
    });
    const text = (await res.text()).slice(0, 300);
    if (/does not exist|Could not find the table|PGRST205/.test(text)) return { name, status: 'CHƯA TẠO ❌', detail: text };
    if (/permission denied|row-level security/i.test(text)) return { name, status: 'ĐÃ TẠO ✅ (RLS đang chặn đúng)', detail: text };
    return { name, status: 'ĐÃ TẠO ✅', detail: 'HTTP ' + res.status };
  } catch (e) {
    return { name, status: 'LỖI MẠNG ⚠️', detail: e.message };
  }
}

async function column(tableName, col) {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + tableName + '?select=' + col + '&limit=1', {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY },
    });
    const text = (await res.text()).slice(0, 300);
    if (/does not exist/.test(text)) return { name: tableName + '.' + col, status: 'CHƯA CÓ CỘT ❌', detail: text };
    return { name: tableName + '.' + col, status: 'ĐÃ CÓ ✅', detail: 'HTTP ' + res.status };
  } catch (e) {
    return { name: tableName + '.' + col, status: 'LỖI MẠNG ⚠️', detail: e.message };
  }
}

const results = [];
results.push(await edge('auth-login'));
results.push(await edge('auth-logout'));
results.push(await edge('auth-me'));
results.push(await edge('booking-availability'));
results.push(await edge('booking-create'));
results.push(await rpc('eduteach_cancel_session', { p_session_id: null, p_user_id: null }));
results.push(await rpc('eduteach_reschedule_session', { p_session_id: null, p_user_id: null, p_new_start: null, p_new_end: null }));
results.push(await table('booking_slot_locks'));
results.push(await table('signaling_messages'));
results.push(await column('sessions', 'scheduled_start,scheduled_end'));
results.push(await column('sessions', 'cancelled_at'));
results.push(await column('users', 'firebase_uid')); // SQL 05
results.push(await rpc('eduteach_settle_pending_balance', { p_user_id: null })); // SQL 07

console.log('\n========== EDU TEACH DEPLOY CHECK ==========');
for (const r of results) {
  console.log((r.status.includes('✅') ? '✅' : '❌') + '  ' + r.name + '  →  ' + r.status);
  if (r.detail && r.status.includes('❌')) console.log('     ' + r.detail);
}
const ok = results.filter(r => r.status.includes('✅')).length;
console.log('============================================');
console.log(ok + '/' + results.length + ' hạng mục sẵn sàng');
