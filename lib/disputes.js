import { supabase } from './supabase';
import { createNotification } from './notif';

export async function createDispute({
  sessionId,
  raisedBy,
  reason,
  sessionNumber,
  subject,
}) {
  try {
    if (!sessionId) {
      return { error: 'Không tìm thấy buổi học.' };
    }

    if (!raisedBy) {
      return { error: 'Không xác định được người khiếu nại.' };
    }

    const cleanReason = String(reason || '').trim();

    if (cleanReason.length < 10) {
      return { error: 'Vui lòng nhập lý do khiếu nại ít nhất 10 ký tự.' };
    }

    // Kiểm tra khiếu nại đang mở để tránh gửi trùng
    const { data: existing, error: checkError } = await supabase
      .from('disputes')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('raised_by', raisedBy)
      .eq('status', 'open')
      .maybeSingle();

    if (checkError) {
      return { error: checkError.message };
    }

    if (existing) {
      return {
        error: 'Buổi học này đã có khiếu nại đang chờ Admin xử lý.',
      };
    }

    // Tạo hồ sơ khiếu nại thật
    const { data: dispute, error: insertError } = await supabase
      .from('disputes')
      .insert({
        session_id: sessionId,
        raised_by: raisedBy,
        reason: cleanReason,
        evidence_urls: [],
        status: 'open',
      })
      .select()
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    // Chuyển buổi học sang trạng thái khiếu nại
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({
        status: 'disputed',
      })
      .eq('id', sessionId);

    if (sessionError) {
      // Rollback hồ sơ nếu update session thất bại
      await supabase
        .from('disputes')
        .delete()
        .eq('id', dispute.id);

      return { error: sessionError.message };
    }

    // Lấy danh sách Admin
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('status', 'active');

    // Báo cho toàn bộ Admin
    if (admins?.length) {
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: '⚠️ Có khiếu nại mới',
          body:
            'Học sinh khiếu nại buổi ' +
            (sessionNumber || '') +
            ' môn ' +
            (subject || 'khóa học') +
            '.',
          type: 'session',
          refId: sessionId,
        });
      }
    }

    return {
      ok: true,
      dispute,
    };
  } catch (error) {
    console.error('createDispute error:', error);

    return {
      error: error?.message || 'Không thể gửi khiếu nại.',
    };
  }
}
