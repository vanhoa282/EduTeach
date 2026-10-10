import { createClient } from 'npm:@supabase/supabase-js@2';
import bcrypt from 'npm:bcryptjs@2.4.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
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
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return respond({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const phone = body?.phone;
    const password = body?.password;

    if (
      typeof phone !== 'string' ||
      typeof password !== 'string' ||
      phone.length < 9 ||
      phone.length > 20 ||
      password.length < 1 ||
      password.length > 256
    ) {
      return respond({ error: 'Thông tin đăng nhập không hợp lệ' }, 400);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      return respond({ error: 'Server chưa cấu hình' }, 503);
    }

    const db = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Không lưu số điện thoại vào bảng theo dõi đăng nhập sai.
    const phoneHash = await sha256(phone.trim());

    const { data: attempt, error: attemptError } = await db
      .from('eduteach_login_attempts')
      .select('blocked_until')
      .eq('phone_hash', phoneHash)
      .maybeSingle();

    if (attemptError) {
      return respond({ error: 'Không kiểm tra được giới hạn đăng nhập' }, 503);
    }

    if (
      attempt?.blocked_until &&
      Date.parse(attempt.blocked_until) > Date.now()
    ) {
      return respond({
        error: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.'
      }, 429);
    }

    const { data: user, error } = await db
      .from('users')
      .select('id,phone,password,role,status,full_name,avatar_url')
      .eq('phone', phone.trim())
      .maybeSingle();

    if (error) {
      return respond({ error: 'Không thể đăng nhập' }, 503);
    }

    const storedPassword = user?.password;

    const valid =
      typeof storedPassword === 'string' &&
      (
        storedPassword.startsWith('$2')
          ? await bcrypt.compare(password, storedPassword)
          : storedPassword === password
      );

    // Tai khoan cu dung mat khau plaintext:
    // chuyen sang bcrypt ngay sau khi xac minh thanh cong.
    if (valid && !storedPassword.startsWith('$2')) {
      const hashed = await bcrypt.hash(password, 12);

      const { data: migrated, error: migrationError } = await db
        .from('users')
        .update({ password: hashed })
        .eq('id', user.id)
        .eq('password', storedPassword)
        .select('id');

      if (migrationError || !migrated?.length) {
        return respond({
          error: 'Không thể nâng cấp bảo mật tài khoản'
        }, 503);
      }
    }

    if (!valid || user.status !== 'active') {
      const { data: blockedUntil, error: failureError } = await db.rpc(
        'eduteach_record_login_failure',
        { p_phone_hash: phoneHash }
      );

      if (failureError) {
        return respond({ error: 'Không ghi nhận được lần đăng nhập sai' }, 503);
      }

      if (blockedUntil && Date.parse(blockedUntil) > Date.now()) {
        return respond({
          error: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.'
        }, 429);
      }

      return respond({ error: 'Thông tin đăng nhập không đúng' }, 401);
    }

    // Đăng nhập đúng thì xóa bộ đếm sai.
    const { error: resetError } = await db
      .from('eduteach_login_attempts')
      .delete()
      .eq('phone_hash', phoneHash);

    if (resetError) {
      return respond({ error: 'Không đặt lại được giới hạn đăng nhập' }, 503);
    }

    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const tokenHash = await sha256(token);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: sessionError } = await db
      .from('eduteach_auth_sessions')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });

    if (sessionError) {
      console.error('Cannot create auth session');
      return respond({ error: 'Không tạo được phiên đăng nhập' }, 503);
    }

    return respond({
      ok: true,
      token,
      expires_at: expiresAt,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
    });
  } catch {
    return respond({ error: 'Yêu cầu không hợp lệ' }, 400);
  }
});
