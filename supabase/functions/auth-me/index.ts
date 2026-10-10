import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info, x-eduteach-session',
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
    new TextEncoder().encode(value)
  );

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

  const token = req.headers.get('x-eduteach-session');

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return respond({ error: 'Phiên đăng nhập không hợp lệ' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    return respond({ error: 'Server chưa cấu hình' }, 503);
  }

  try {
    const db = createClient(url, key, {
      auth: { persistSession: false },
    });

    const tokenHash = await sha256(token);

    const { data: session, error } = await db
      .from('eduteach_auth_sessions')
      .select('user_id,expires_at,revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      return respond({ error: 'Không kiểm tra được phiên' }, 503);
    }

    if (
      !session ||
      session.revoked_at ||
      Date.parse(session.expires_at) <= Date.now()
    ) {
      return respond({ error: 'Phiên đăng nhập đã hết hạn' }, 401);
    }

    const { data: user, error: userError } = await db
      .from('users')
      .select('id,phone,role,status,full_name,avatar_url')
      .eq('id', session.user_id)
      .maybeSingle();

    if (userError) {
      return respond({ error: 'Không kiểm tra được tài khoản' }, 503);
    }

    if (!user || user.status !== 'active') {
      return respond({ error: 'Tài khoản không còn hoạt động' }, 403);
    }

    return respond({
      ok: true,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
      expires_at: session.expires_at,
    });
  } catch {
    return respond({ error: 'Lỗi kiểm tra phiên' }, 500);
  }
});
