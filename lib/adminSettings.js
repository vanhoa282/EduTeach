import { supabase } from './supabase';
import { createNotification } from './notif';
import { payTutorForSession } from './wallet';

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
  try {
    if (!['resolved', 'rejected'].includes(action)) {
      return { error: 'Trạng thái xử lý không hợp lệ' };
    }

    const cleanNote = String(note || '').trim();

    if (!cleanNote) {
      return { error: 'Vui lòng nhập ghi chú xử lý' };
    }

    // Lấy dữ liệu khiếu nại mới nhất
    const { data: dispute, error: getError } = await supabase
      .from('disputes')
      .select(`
        *,
        session:sessions (
          id,
          status,
          session_number,
          tutor_payout,
          course_id,
          course:courses (
            id,
            subject,
            student_id,
            tutor_id
          )
        )
      `)
      .eq('id', disputeId)
      .maybeSingle();

    if (getError) {
      return { error: getError.message };
    }

    if (!dispute) {
      return { error: 'Không tìm thấy khiếu nại' };
    }

    if (dispute.status !== 'open') {
      return {
        error: 'Khiếu nại này đã được xử lý trước đó'
      };
    }

    const session = dispute.session;
    const course = session?.course;

    if (!session?.id) {
      return {
        error: 'Không tìm thấy buổi học của khiếu nại'
      };
    }

    // =========================================
    // BÁC BỎ KHIẾU NẠI
    // =========================================
    if (action === 'rejected') {
      // Thanh toán GS trước.
      // payTutorForSession có chống payout lại bằng tutor_payout.
      const payoutResult = await payTutorForSession(session.id);

      if (payoutResult?.error) {
        console.error(
          'Payout rejected dispute error:',
          payoutResult.error
        );

        return {
          error:
            'Không thể thanh toán cho gia sư: ' +
            payoutResult.error
        };
      }

      // Payout thành công mới xác nhận buổi học
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({
          status: 'confirmed',
        })
        .eq('id', session.id);

      if (sessionError) {
        console.error(
          'Confirm rejected dispute session:',
          sessionError
        );

        return {
          error:
            'Gia sư đã được thanh toán nhưng không thể cập nhật buổi học: ' +
            sessionError.message
        };
      }

      // Cuối cùng mới đóng khiếu nại
      const { error: disputeError } = await supabase
        .from('disputes')
        .update({
          status: 'rejected',
          resolution_note: cleanNote,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId)
        .eq('status', 'open');

      if (disputeError) {
        console.error(
          'Reject dispute update error:',
          disputeError
        );

        return {
          error:
            'Buổi học đã được xác nhận nhưng không thể đóng khiếu nại: ' +
            disputeError.message
        };
      }
    }

    // =========================================
    // CHẤP NHẬN KHIẾU NẠI
    // =========================================
    if (action === 'resolved') {
      // Chuyển session sang cancelled trước
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({
          status: 'cancelled',
        })
        .eq('id', session.id);

      if (sessionError) {
        return {
          error:
            'Không thể cập nhật buổi học: ' +
            sessionError.message
        };
      }

      // Sau đó đóng khiếu nại
      const { error: disputeError } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution_note: cleanNote,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId)
        .eq('status', 'open');

      if (disputeError) {
        return {
          error:
            'Không thể cập nhật khiếu nại: ' +
            disputeError.message
        };
      }
    }

    // =========================================
    // THÔNG BÁO HỌC SINH
    // =========================================
    if (dispute.raised_by) {
      await createNotification({
        userId: dispute.raised_by,

        title:
          action === 'resolved'
            ? '✅ Khiếu nại đã được chấp nhận'
            : '❌ Khiếu nại đã bị bác bỏ',

        body:
          action === 'resolved'
            ? 'Khiếu nại buổi ' +
              (session.session_number || '') +
              ' môn ' +
              (course?.subject || 'khóa học') +
              ' đã được Admin chấp nhận. ' +
              cleanNote
            : 'Khiếu nại buổi ' +
              (session.session_number || '') +
              ' môn ' +
              (course?.subject || 'khóa học') +
              ' đã bị bác bỏ. Buổi học được tự động xác nhận. ' +
              cleanNote,

        type: 'session',
        refId: session.id,
      });
    }

    // =========================================
    // THÔNG BÁO GIA SƯ
    // =========================================
    if (course?.tutor_id) {
      await createNotification({
        userId: course.tutor_id,

        title:
          action === 'resolved'
            ? '⚠️ Khiếu nại buổi học được chấp nhận'
            : '✅ Khiếu nại buổi học đã bị bác bỏ',

        body:
          action === 'resolved'
            ? 'Khiếu nại buổi ' +
              (session.session_number || '') +
              ' môn ' +
              (course?.subject || 'khóa học') +
              ' đã được Admin chấp nhận.'
            : 'Khiếu nại buổi ' +
              (session.session_number || '') +
              ' môn ' +
              (course?.subject || 'khóa học') +
              ' đã bị bác bỏ và buổi học được xác nhận.',

        type: 'session',
        refId: session.id,
      });
    }

    return {
      ok: true,
      status: action,
    };
  } catch (error) {
    console.error(
      'adminResolveDispute error:',
      error
    );

    return {
      error:
        error?.message ||
        'Không thể xử lý khiếu nại',
    };
  }
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
