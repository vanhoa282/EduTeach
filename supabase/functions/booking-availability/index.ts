import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const isUuid = (value: unknown) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

type Occupied = { start_at: string; end_at: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const tutorId = body?.tutor_id;
    const from = body?.from;
    const to = body?.to;

    if (!isUuid(tutorId)) {
      return json({ error: 'Gia sư không hợp lệ' }, 400);
    }

    if (typeof from !== 'string' || typeof to !== 'string') {
      return json({ error: 'Khoảng thời gian không hợp lệ' }, 400);
    }

    const start = Date.parse(from);
    const end = Date.parse(to);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end - start > 181 * 86400000
    ) {
      return json({ error: 'Khoảng tìm kiếm không hợp lệ' }, 400);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      return json({ error: 'Server chưa được cấu hình' }, 503);
    }

    const db = createClient(url, key, {
      auth: { persistSession: false },
    });

    const occupied: Occupied[] = [];
    const seen = new Set<string>();
    const pushUnique = (item: Occupied) => {
      const keyId = `${item.start_at}|${item.end_at}`;
      if (seen.has(keyId)) return;
      seen.add(keyId);
      occupied.push(item);
    };

    const pageSize = 500;
    let offset = 0;
    const now = Date.now();

    // 1) Lịch đang giữ / đã đặt qua booking_slot_locks
    while (true) {
      const { data, error } = await db
        .from('booking_slot_locks')
        .select('start_at,end_at,status,expires_at')
        .eq('tutor_id', tutorId)
        .in('status', ['held', 'booked'])
        .lt('start_at', to)
        .gt('end_at', from)
        .order('start_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('booking availability locks query failed');
        return json({ error: 'Không đọc được lịch' }, 503);
      }

      for (const item of data ?? []) {
        if (
          item.status === 'booked' ||
          (
            item.status === 'held' &&
            item.expires_at &&
            Date.parse(item.expires_at) > now
          )
        ) {
          pushUnique({
            start_at: item.start_at,
            end_at: item.end_at,
          });
        }
      }

      if (!data || data.length < pageSize) break;
      offset += pageSize;
      if (offset >= 10000) {
        return json({ error: 'Khoảng tìm kiếm có quá nhiều lịch' }, 503);
      }
    }

    // 2) Buổi học cũ (sessions) — không lộ thông tin học viên
    offset = 0;
    while (true) {
      const { data, error } = await db
        .from('sessions')
        .select(`
          scheduled_at,
          scheduled_start,
          scheduled_end,
          status,
          courses!inner (
            tutor_id,
            status
          )
        `)
        .eq('courses.tutor_id', tutorId)
        .neq('status', 'cancelled')
        .neq('courses.status', 'cancelled')
        .order('scheduled_at', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('booking availability sessions query failed');
        return json({ error: 'Không đọc được lịch' }, 503);
      }

      for (const row of data ?? []) {
        const startAt = row.scheduled_start || row.scheduled_at;
        if (!startAt) continue;
        const endAt = row.scheduled_end
          || new Date(Date.parse(startAt) + 2 * 3600000).toISOString();

        if (Date.parse(startAt) < end && Date.parse(endAt) > start) {
          pushUnique({ start_at: startAt, end_at: endAt });
        }
      }

      if (!data || data.length < pageSize) break;
      offset += pageSize;
      if (offset >= 10000) {
        return json({ error: 'Khoảng tìm kiếm có quá nhiều lịch' }, 503);
      }
    }

    occupied.sort(
      (a, b) => Date.parse(a.start_at) - Date.parse(b.start_at)
    );

    return json({ occupied });
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ' }, 400);
  }
});
