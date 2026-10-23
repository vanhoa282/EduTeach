// EduTeach: xác minh Firebase ID token (RS256) bằng Google JWKS.
// KHÔNG cần service account JSON — chỉ cần projectId.
// Deploy trên Dashboard → Edge Functions (JWT Verification: OFF).
// Env: FIREBASE_PROJECT_ID (mặc định eduteach-2ace8)
//
// Mở rộng 2026-10-23 (Cooper) cho OTP đăng ký:
// - Trả thêm phone (claim phone_number) + authTime trong response.
// - Body { requireFreshPhone: true } → bắt buộc token có phone_number đã xác minh
//   và auth_time trong vòng 10 phút (chống dùng lại token cũ để đăng ký).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  let out = '';
  for (let i = 0; i < bin.length; i++) {
    out += String.fromCharCode(bin.charCodeAt(i));
  }
  return decodeURIComponent(escape(out));
}

async function verifyFirebaseToken(token: string, projectId: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const header = JSON.parse(b64urlDecode(parts[0]));
  const payload = JSON.parse(b64urlDecode(parts[1]));

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (payload.aud !== projectId) return null;
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) return null;

  const jwksRes = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!jwksRes.ok) return null;
  const jwks = await jwksRes.json();

  const jwk = (jwks.keys || []).find((k: { kid?: string }) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const sigB64 = parts[2].replace(/-/g, '+').replace(/_/g, '/');
  const pad = sigB64.length % 4 === 0 ? '' : '='.repeat(4 - (sigB64.length % 4));
  const sig = Uint8Array.from(atob(sigB64 + pad), (c) => c.charCodeAt(0));

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    sig,
    new TextEncoder().encode(parts[0] + '.' + parts[1])
  );

  return valid ? payload : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return respond({ ok: false, message: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const token = body?.token;

    if (typeof token !== 'string' || token.length < 20) {
      return respond({ ok: false, message: 'Thiếu token' }, 400);
    }

    const projectId = Deno.env.get('FIREBASE_PROJECT_ID') || 'eduteach-2ace8';

    const payload = await verifyFirebaseToken(token, projectId);
    if (!payload) {
      return respond({ ok: false, message: 'Token Firebase không hợp lệ' }, 401);
    }

    const phone =
      typeof payload.phone_number === 'string' ? payload.phone_number : null;
    const authTime =
      typeof payload.auth_time === 'number' ? payload.auth_time : null;

    if (body?.requireFreshPhone === true) {
      if (!phone) {
        return respond(
          { ok: false, message: 'Token chưa xác minh số điện thoại' },
          401
        );
      }
      const now = Math.floor(Date.now() / 1000);
      if (authTime === null || now - authTime > 600) {
        return respond(
          {
            ok: false,
            message: 'Phiên xác minh đã quá cũ, vui lòng nhận mã OTP mới',
          },
          401
        );
      }
    }

    return respond({
      ok: true,
      uid: payload.sub,
      email: payload.email || null,
      phone,
      authTime,
    });
  } catch (e) {
    return respond({ ok: false, message: 'Lỗi xác minh token' }, 500);
  }
});
