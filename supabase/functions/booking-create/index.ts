import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-eduteach-session, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: cors,
    });
  }

  if (req.method !== 'POST') {
    return respond({ error: 'Method not allowed' }, 405);
  }

  try {
    // Token rieng cua EduTeach.
    const token = req.headers.get('x-eduteach-session') || '';

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return respond({ error: 'Vui lòng đăng nhập lại' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      return respond({ error: 'Server chưa cấu hình' }, 503);
    }

    const db = createClient(url, key, {
      auth: { persistSession: false },
    });

    const tokenHash = await sha256(token);

    // Xac minh phien dang nhap.
    const { data: session, error: sessionError } = await db
      .from('eduteach_auth_sessions')
      .select('user_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (
      sessionError ||
      !session ||
      session.revoked_at ||
      Date.parse(session.expires_at) <= Date.now()
    ) {
      return respond({
        error: 'Phiên đăng nhập đã hết hạn',
      }, 401);
    }

    // Xac minh hoc vien.
    const { data: student, error: userError } = await db
      .from('users')
      .select('id,role,status')
      .eq('id', session.user_id)
      .maybeSingle();

    if (
      userError ||
      !student ||
      student.role !== 'student' ||
      student.status !== 'active'
    ) {
      return respond({
        error: 'Tài khoản không được phép đặt lịch',
      }, 403);
    }

    const body = await req.json();

    // Kiem tra du lieu dau vao.
    if (
      typeof body?.tutor_id !== 'string' ||
      typeof body?.subject !== 'string' ||
      body.subject.trim().length < 1 ||
      body.subject.length > 150 ||
      !Array.isArray(body?.slots) ||
      ![10, 20, 30].includes(body.slots.length) ||
      !['full', 'half'].includes(body?.payment_type)
    ) {
      return respond({
        error: 'Dữ liệu đặt lịch không hợp lệ',
      }, 400);
    }

    // Database tao khoa hoc, hoa don va giu lich
    // trong cung mot giao dich.
    const { data, error } = await db.rpc(
      'eduteach_create_booking_atomic',
      {
        p_student_id: student.id,
        p_tutor_id: body.tutor_id,
        p_subject: body.subject.trim(),
        p_slots: body.slots,
        p_payment_type: body.payment_type,
      },
    );

    if (error) {
      console.error('Atomic booking rejected:', error.code);

      return respond({
        ok: false,
        error: 'BOOKING_REJECTED',
        message:
          'Không thể giữ lịch. Vui lòng kiểm tra lịch trống và thử lại.',
      }, 409);
    }

    return respond(data);
  } catch {
    return respond({
      error: 'Yêu cầu không hợp lệ',
    }, 400);
  }
});
