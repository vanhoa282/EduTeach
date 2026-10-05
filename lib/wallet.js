import { supabase } from './supabase';
import { createNotification } from './notif';

// ============ CỘNG TIỀN GIA SƯ KHI HS XÁC NHẬN BUỔI ============
export async function payTutorForSession(sessionId) {
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select(`
      *,
      course:courses (
        id, tutor_id, student_id, subject, price_per_session, commission_rate
      )
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (sErr || !session) return { error: sErr?.message || 'Session not found' };
  if (session.tutor_payout > 0) return { ok: true, skipped: true };

  const course = session.course;
  if (!course) return { error: 'Course not found' };

  const price = course.price_per_session || 0;
  const rate = course.commission_rate || 10;
  const fee = Math.round(price * rate / 100);
  const payout = price - fee;

  // 1. Update session
  const { error: updSessionErr } = await supabase
    .from('sessions')
    .update({ tutor_payout: payout, app_fee: fee })
    .eq('id', sessionId);
  if (updSessionErr) return { error: updSessionErr.message };

  // 2. Lấy ví gia sư
  const { data: wallet } = await supabase
    .from('wallets').select('*').eq('user_id', course.tutor_id).maybeSingle();

  // 3. Cộng pending
  if (!wallet) {
    await supabase.from('wallets').insert({
      user_id: course.tutor_id,
      balance_pending: payout,
      balance_available: 0,
    });
  } else {
    await supabase
      .from('wallets')
      .update({
        balance_pending: (wallet.balance_pending || 0) + payout,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', course.tutor_id);
  }

  // 4. Transaction
  await supabase.from('transactions').insert({
    user_id: course.tutor_id,
    type: 'session_earning',
    amount: payout,
    status: 'pending',
    ref_id: sessionId,
    note: `Buổi ${session.session_number} - sau phí ${rate}%`,
  });

  if (fee > 0) {
    await supabase.from('transactions').insert({
      user_id: course.tutor_id,
      type: 'app_fee',
      amount: -fee,
      status: 'completed',
      ref_id: sessionId,
      note: `Hoa hồng ${rate}% buổi ${session.session_number}`,
    });
  }

  // ✅ THÔNG BÁO CHO GIA SƯ
  await createNotification({
    userId: course.tutor_id,
    title: '💰 Bạn có thu nhập mới',
    body: `Buổi ${session.session_number} môn ${course.subject} đã được xác nhận. +${payout.toLocaleString('vi-VN')}đ vào ví (chờ 7 ngày).`,
    type: 'session',
    refId: sessionId,
  });

  return { ok: true, payout, fee };
}

// ============ LẤY VÍ ============
export async function getWallet(userId) {
  const [walletRes, txnRes] = await Promise.all([
    supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  return {
    wallet: walletRes.data || { balance_available: 0, balance_pending: 0 },
    transactions: txnRes.data || [],
  };
}

// ============ YÊU CẦU RÚT TIỀN ============
export async function requestWithdraw({ userId, amount, bankName, bankAccount, bankHolder }) {
  if (!userId) return { error: 'Chưa đăng nhập' };
  if (amount < 50000) return { error: 'Số tiền tối thiểu 50.000đ' };

  const { data: wallet, error: wErr } = await supabase
    .from('wallets').select('*').eq('user_id', userId).maybeSingle();
  if (wErr) return { error: wErr.message };
  if (!wallet) return { error: 'Không tìm thấy ví' };
  if ((wallet.balance_available || 0) < amount) {
    return { error: 'Số dư khả dụng không đủ' };
  }

  const { error: insErr } = await supabase.from('withdraw_requests').insert({
    user_id: userId,
    amount,
    bank_name: bankName,
    bank_account: bankAccount,
    bank_holder: bankHolder,
    status: 'pending',
  });
  if (insErr) return { error: insErr.message };

  return { ok: true };
}

export async function getMyWithdraws(userId) {
  const { data, error } = await supabase
    .from('withdraw_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return data || [];
}

// ============ ADMIN DUYỆT RÚT ============
export async function adminGetWithdraws() {
  const { data, error } = await supabase
    .from('withdraw_requests')
    .select(`*, user:users!withdraw_requests_user_id_fkey (id, full_name, phone)`)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { error: error.message };
  return { withdraws: data || [] };
}

export async function adminApproveWithdraw(withdrawId) {
  const { data: w, error: wErr } = await supabase
    .from('withdraw_requests').select('*').eq('id', withdrawId).maybeSingle();
  if (wErr || !w) return { error: wErr?.message || 'Không tìm thấy yêu cầu' };

  const { error: updErr } = await supabase
    .from('withdraw_requests')
    .update({ status: 'done', processed_at: new Date().toISOString() })
    .eq('id', withdrawId);
  if (updErr) return { error: updErr.message };

  const { data: wallet } = await supabase
    .from('wallets').select('*').eq('user_id', w.user_id).maybeSingle();
  if (wallet) {
    await supabase.from('wallets').update({
      balance_available: Math.max(0, (wallet.balance_available || 0) - w.amount),
      updated_at: new Date().toISOString(),
    }).eq('user_id', w.user_id);
  }

  await supabase.from('transactions').insert({
    user_id: w.user_id,
    type: 'withdraw',
    amount: -w.amount,
    status: 'completed',
    ref_id: withdrawId,
    note: `Rút về ${w.bank_name} ${w.bank_account}`,
  });

  // ✅ THÔNG BÁO CHO GIA SƯ
  await createNotification({
    userId: w.user_id,
    title: '✅ Yêu cầu rút tiền đã được duyệt',
    body: `Đã chuyển ${w.amount.toLocaleString('vi-VN')}đ về ${w.bank_name} - ${w.bank_account}. Kiểm tra tài khoản trong 24h.`,
    type: 'withdraw',
    refId: withdrawId,
  });

  return { ok: true };
}

export async function adminRejectWithdraw(withdrawId, note) {
  const { data: w } = await supabase
    .from('withdraw_requests').select('*').eq('id', withdrawId).maybeSingle();

  const { error } = await supabase
    .from('withdraw_requests')
    .update({
      status: 'rejected',
      note: note || 'Admin từ chối',
      processed_at: new Date().toISOString(),
    })
    .eq('id', withdrawId);
  if (error) return { error: error.message };

  // ✅ THÔNG BÁO CHO GIA SƯ
  if (w) {
    await createNotification({
      userId: w.user_id,
      title: '❌ Yêu cầu rút tiền bị từ chối',
      body: `Yêu cầu rút ${w.amount.toLocaleString('vi-VN')}đ đã bị từ chối. Lý do: ${note || 'Admin từ chối'}`,
      type: 'withdraw',
      refId: withdrawId,
    });
  }

  return { ok: true };
}
