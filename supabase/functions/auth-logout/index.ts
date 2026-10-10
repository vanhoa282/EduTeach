import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
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

  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return respond({ error: 'Phiên đăng nhập không hợp lệ' }, 401);
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

  const { error } = await db
    .from('eduteach_auth_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .is('revoked_at', null);

  if (error) {
    return respond({ error: 'Không thể đăng xuất' }, 503);
  }

  return respond({ ok: true });
});
