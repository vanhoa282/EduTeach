import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET')!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE);

type Row = Record<string, unknown>;
const str = (v: unknown) => typeof v === 'string' ? v : '';

async function deliver(ids: string[], title: string, body: string, data: Row) {
  if (!ids.length) return;
  const unique = [...new Set(ids)];
  const tokens: string[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const { data: users, error } = await db.from('users').select('push_token').in('id', unique.slice(i, i + 100));
    if (error) throw error;
    for (const user of users ?? []) {
      if (typeof user.push_token === 'string' && /^Expo(nent)?PushToken\[/.test(user.push_token)) tokens.push(user.push_token);
    }
  }
  const messages = [...new Set(tokens)].map(to => ({
    to, title: title.slice(0, 100), body: body.slice(0, 500),
    sound: 'default', priority: 'high', channelId: 'default', data,
  }));
  for (let i = 0; i < messages.length; i += 100) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
    if (!response.ok) throw new Error(`Expo push HTTP ${response.status}: ${await response.text()}`);
    const result = await response.json();
    const errors = (result.data ?? []).filter((item: Row) => item.status === 'error');
    if (errors.length) console.error('Expo push ticket errors', errors);
  }
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!HOOK_SECRET || req.headers.get('x-eduteach-webhook-secret') !== HOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const event = await req.json();
    if (event.type !== 'INSERT') return new Response('Ignored');
    const row: Row = event.record ?? {};
    if (event.table === 'messages') {
      const conversationId = str(row.conversation_id);
      const senderId = str(row.sender_id);
      if (!conversationId || !senderId) return new Response('Ignored');
      const { data: conv, error } = await db.from('conversations')
        .select('student_id,tutor_id').eq('id', conversationId).maybeSingle();
      if (error) throw error;
      if (!conv || ![conv.student_id, conv.tutor_id].includes(senderId)) return new Response('Ignored');
      const recipient = conv.student_id === senderId ? conv.tutor_id : conv.student_id;
      const { data: sender } = await db.from('users').select('full_name').eq('id', senderId).maybeSingle();
      await deliver([recipient], `💬 ${sender?.full_name || 'Tin nhắn mới'}`, str(row.content) || 'Bạn có tin nhắn mới',
        { type: 'message', conversationId, messageId: str(row.id) });
    } else if (event.table === 'announcements') {
      if (row.active !== true) return new Response('Ignored');
      const audience = str(row.audience) || 'all';
      if (!['all', 'student', 'tutor'].includes(audience)) return new Response('Ignored');
      let offset = 0;
      while (true) {
        let query = db.from('users').select('id').order('id').range(offset, offset + 499);
        if (audience !== 'all') query = query.eq('role', audience);
        const { data: users, error } = await query;
        if (error) throw error;
        await deliver((users ?? []).map(u => u.id), str(row.title) || 'Thông báo EduTeach', str(row.content),
          { type: 'announcement', announcementId: str(row.id) });
        if (!users || users.length < 500) break;
        offset += 500;
      }
    } else if (event.table === 'notifications') {
      const id = str(row.user_id);
      if (id) await deliver([id], str(row.title) || 'EduTeach', str(row.body) || 'Bạn có thông báo mới',
        { type: str(row.type) || 'system', refId: str(row.ref_id), notificationId: str(row.id) });
    } else return new Response('Ignored');
    return new Response('OK');
  } catch (error) {
    console.error('push-webhook failed', error);
    return new Response('Internal error', { status: 500 });
  }
});
