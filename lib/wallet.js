import { supabase } from './supabase';

// Cộng tiền cho gia sư khi HS xác nhận buổi học
export async function payTutorForSession(sessionId) {
  // 1. Lấy session + course
  const { data: session, error: sErr } = await supabase
    .from('sessions')
    .select(`
      *,
      course:courses (
        id, tutor_id, price_per_session, commission_rate
      )
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (sErr || !session) return { error: sErr?.message || 'Session not found' };
  if (session.tutor_payout > 0) return { ok: true, skipped: true }; // đã trả rồi

  const course = session.course;
  if (!course) return { error: 'Course not found' };

  const price = course.price_per_session || 0;
  const rate = course.commission_rate || 10;
  const fee = Math.round(price * rate / 100);
  const payout = price - fee;

  // 2. Update session với payout + fee
  const { error: updSessionErr } = await supabase
    .from('sessions')
    .update({ tutor_payout: payout, app_fee: fee })
    .eq('id', sessionId);

  if (updSessionErr) return { error: updSessionErr.message };

  // 3. Lấy ví gia sư
  const { data: wallet, error: wErr } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', course.tutor_id)
    .maybeSingle();

  if (wErr) return { error: wErr.message };

  // 4. Cộng vào balance_pending
  if (!wallet) {
    const { error: insErr } = await supabase.from('wallets').insert({
      user_id: course.tutor_id,
      balance_pending: payout,
      balance_available: 0,
    });
    if (insErr) return { error: insErr.message };
  } else {
    const { error: updWalletErr } = await supabase
      .from('wallets')
      .update({
        balance_pending: (wallet.balance_pending || 0) + payout,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', course.tutor_id);
    if (updWalletErr) return { error: updWalletErr.message };
  }

  // 5. Ghi transaction
  await supabase.from('transactions').insert({
    user_id: course.tutor_id,
    type: 'session_earning',
    amount: payout,
    status: 'pending',
    ref_id: sessionId,
    note: `Buổi ${session.session_number} - sau phí ${rate}%`,
  });

  // 6. Ghi phí app
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

  return { ok: true, payout, fee };
}

// Lấy ví + transactions của 1 user
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

// ============ RÚT TIỀN ============
export async function requestWithdraw({ userId, amount, bankName, bankAccount, bankHolder }) {
  if (!userId) return { error: 'Chưa đăng nhập' };
  if (amount < 50000) return { error: 'Số tiền tối thiểu 50.000đ' };

  // Lấy ví
  const { data: wallet, error: wErr } = await supabase
    .from('wallets').select('*').eq('user_id', userId).maybeSingle();
  if (wErr) return { error: wErr.message };
  if (!wallet) return { error: 'Không tìm thấy ví' };
  if ((wallet.balance_available || 0) < amount) {
    return { error: 'Số dư khả dụng không đủ' };
  }

  // Tạo yêu cầu rút
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

  // Update status
  const { error: updErr } = await supabase
    .from('withdraw_requests')
    .update({ status: 'done', processed_at: new Date().toISOString() })
    .eq('id', withdrawId);
  if (updErr) return { error: updErr.message };

  // Trừ ví
  const { data: wallet } = await supabase
    .from('wallets').select('*').eq('user_id', w.user_id).maybeSingle();
  if (wallet) {
    await supabase.from('wallets').update({
      balance_available: Math.max(0, (wallet.balance_available || 0) - w.amount),
      updated_at: new Date().toISOString(),
    }).eq('user_id', w.user_id);
  }

  // Ghi transaction
  await supabase.from('transactions').insert({
    user_id: w.user_id,
    type: 'withdraw',
    amount: -w.amount,
    status: 'completed',
    ref_id: withdrawId,
    note: `Rút về ${w.bank_name} ${w.bank_account}`,
  });

  return { ok: true };
}

export async function adminRejectWithdraw(withdrawId, note) {
  const { error } = await supabase
    .from('withdraw_requests')
    .update({ status: 'rejected', note: note || 'Admin từ chối', processed_at: new Date().toISOString() })
    .eq('id', withdrawId);
  if (error) return { error: error.message };
  return { ok: true };
}
