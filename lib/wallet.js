import { supabase } from './supabase';
import { createNotification } from './notif';

// Cộng tiền gia sư khi HS xác nhận buổi (vào AVAILABLE ngay)
export async function payTutorForSession(sessionId) {
  try {
    const { data: session, error: sErr } = await supabase
      .from('sessions')
      .select(`
        *,
        course:courses (
          id,
          tutor_id,
          student_id,
          subject,
          price_per_session,
          commission_rate
        )
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (sErr) {
      return { error: sErr.message };
    }

    if (!session) {
      return { error: 'Session not found' };
    }

    // Đã payout trước đó -> không cộng lần nữa
    if ((session.tutor_payout || 0) > 0) {
      return {
        ok: true,
        skipped: true,
        payout: session.tutor_payout,
        fee: session.app_fee || 0,
      };
    }

    const course = session.course;

    if (!course) {
      return { error: 'Course not found' };
    }

    if (!course.tutor_id) {
      return { error: 'Không tìm thấy gia sư' };
    }

    const price = Number(course.price_per_session || 0);
    const rate = Number(course.commission_rate ?? 10);

    if (price <= 0) {
      return { error: 'Học phí buổi học không hợp lệ' };
    }

    const fee = Math.round(price * rate / 100);
    const payout = price - fee;

    if (payout <= 0) {
      return { error: 'Số tiền thanh toán không hợp lệ' };
    }

    // Kiểm tra transaction cũ trước.
    // Đây là lớp bảo vệ bổ sung nếu session đã từng payout
    // nhưng tutor_payout chưa được ghi đúng.
    const { data: oldTransaction, error: txnCheckError } =
      await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', course.tutor_id)
        .eq('type', 'session_earning')
        .eq('ref_id', sessionId)
        .eq('status', 'completed')
        .limit(1)
        .maybeSingle();

    if (txnCheckError) {
      return { error: txnCheckError.message };
    }

    if (oldTransaction) {
      // Đồng bộ lại marker payout trên session.
      const { error: repairError } = await supabase
        .from('sessions')
        .update({
          tutor_payout: payout,
          app_fee: fee,
        })
        .eq('id', sessionId);

      if (repairError) {
        return { error: repairError.message };
      }

      return {
        ok: true,
        skipped: true,
        repaired: true,
        payout,
        fee,
      };
    }

    // Lấy ví hiện tại
    const { data: wallet, error: walletError } =
      await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', course.tutor_id)
        .maybeSingle();

    if (walletError) {
      return { error: walletError.message };
    }

    // Tạo / cập nhật ví
    if (!wallet) {
      const { error: createWalletError } = await supabase
        .from('wallets')
        .insert({
          user_id: course.tutor_id,
          balance_available: payout,
          balance_pending: 0,
        });

      if (createWalletError) {
        return { error: createWalletError.message };
      }
    } else {
      const { error: updateWalletError } = await supabase
        .from('wallets')
        .update({
          balance_available:
            Number(wallet.balance_available || 0) + payout,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', course.tutor_id);

      if (updateWalletError) {
        return { error: updateWalletError.message };
      }
    }

    // Ghi transaction thu nhập
    const { error: earningError } = await supabase
      .from('transactions')
      .insert({
        user_id: course.tutor_id,
        type: 'session_earning',
        amount: payout,
        status: 'completed',
        ref_id: sessionId,
        note:
          `Buổi ${session.session_number} - sau phí ${rate}%`,
      });

    if (earningError) {
      console.error(
        'Create session earning transaction:',
        earningError
      );

      return {
        error:
          'Đã cập nhật ví nhưng không thể ghi giao dịch: ' +
          earningError.message,
      };
    }

    // Ghi phí ứng dụng
    if (fee > 0) {
      const { error: feeError } = await supabase
        .from('transactions')
        .insert({
          user_id: course.tutor_id,
          type: 'app_fee',
          amount: -fee,
          status: 'completed',
          ref_id: sessionId,
          note:
            `Hoa hồng ${rate}% buổi ${session.session_number}`,
        });

      if (feeError) {
        console.error(
          'Create app fee transaction:',
          feeError
        );
      }
    }

    // Đánh dấu session đã payout sau khi tiền + transaction thành công
    const { error: markPaidError } = await supabase
      .from('sessions')
      .update({
        tutor_payout: payout,
        app_fee: fee,
      })
      .eq('id', sessionId);

    if (markPaidError) {
      console.error(
        'Mark session payout:',
        markPaidError
      );

      return {
        error:
          'Đã thanh toán nhưng không thể cập nhật buổi học: ' +
          markPaidError.message,
      };
    }

    await createNotification({
      userId: course.tutor_id,
      title: '💰 Bạn có thu nhập mới',
      body:
        `Buổi ${session.session_number} môn ${course.subject} ` +
        `đã được xác nhận. +${payout.toLocaleString('vi-VN')}đ vào ví.`,
      type: 'session',
      refId: sessionId,
    });

    return {
      ok: true,
      payout,
      fee,
    };
  } catch (error) {
    console.error(
      'payTutorForSession error:',
      error
    );

    return {
      error:
        error?.message ||
        'Không thể thanh toán cho gia sư',
    };
  }
}

export async function getWallet(userId) {
  const [walletRes, txnRes] = await Promise.all([
    supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('transactions').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
  ]);
  return {
    wallet: walletRes.data || { balance_available: 0, balance_pending: 0 },
    transactions: txnRes.data || [],
  };
}

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
  const { data } = await supabase
    .from('withdraw_requests').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  return data || [];
}

export async function adminGetWithdraws() {
  const { data, error } = await supabase
    .from('withdraw_requests')
    .select(`*, user:users!withdraw_requests_user_id_fkey (id, full_name, phone)`)
    .order('created_at', { ascending: false }).limit(50);
  if (error) return { error: error.message };
  return { withdraws: data || [] };
}

export async function adminApproveWithdraw(withdrawId) {
  const { data: w, error: wErr } = await supabase
    .from('withdraw_requests').select('*').eq('id', withdrawId).maybeSingle();
  if (wErr || !w) return { error: wErr?.message || 'Không tìm thấy' };

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

  await createNotification({
    userId: w.user_id,
    title: '✅ Yêu cầu rút tiền đã được duyệt',
    body: `Đã chuyển ${w.amount.toLocaleString('vi-VN')}đ về ${w.bank_name} - ${w.bank_account}.`,
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
