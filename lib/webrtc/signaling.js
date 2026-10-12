import { supabase } from '../supabase';
import { signalingChannelName } from './session';

// ── Signaling qua Supabase (Realtime postgres_changes + POLLING fallback) ──
// Trao đổi SDP/ICE qua bảng signaling_messages (supabase/sql/04_webrtc_signaling.sql).
// Polling đảm bảo hoạt động kể cả khi publication realtime chưa cấu hình đúng.

const SIGNAL_TABLE = 'signaling_messages';
const POLL_INTERVAL_MS = 2500;

export function subscribeSignaling(sessionId, onMessage) {
  const seen = new Set(); // dedupe giữa realtime + polling
  let stopped = false;
  let pollTimer = null;
  let lastSeenTs = new Date().toISOString();

  const deliver = (row) => {
    if (!row || !row.id || seen.has(row.id)) return;
    seen.add(row.id);
    try {
      onMessage(row);
    } catch (e) {
      // không để lỗi callback làm chết kênh
    }
  };

  // 1) Realtime (nhanh nhất nếu publication đã có bảng này)
  const channel = supabase
    .channel(signalingChannelName(sessionId))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: SIGNAL_TABLE,
        filter: 'session_id=eq.' + sessionId,
      },
      (payload) => deliver(payload?.new || null)
    )
    .subscribe();

  // 2) Polling fallback: kéo tin nhắn mới mỗi 2.5s (đề phòng realtime không chạy)
  const poll = async () => {
    if (stopped) return;
    try {
      const { data } = await supabase
        .from(SIGNAL_TABLE)
        .select('*')
        .eq('session_id', sessionId)
        .gt('created_at', lastSeenTs)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data && data.length > 0) {
        for (const row of data) {
          if (row.created_at > lastSeenTs) lastSeenTs = row.created_at;
          deliver(row);
        }
      }
    } catch (e) {
      // mất mạng tạm thời → bỏ qua, lần poll sau sẽ lấy tiếp
    }

    if (!stopped) pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  };
  pollTimer = setTimeout(poll, 1500);

  return {
    unsubscribe() {
      stopped = true;
      if (pollTimer) clearTimeout(pollTimer);
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    },
  };
}

export async function sendSignal(sessionId, senderId, kind, payload) {
  const { error } = await supabase.from(SIGNAL_TABLE).insert({
    session_id: sessionId,
    sender_id: senderId,
    kind,
    payload: payload || {},
  });

  if (error) {
    const msg = error?.message || '';
    if (/does not exist|PGRST|42P01/i.test(msg)) {
      throw new Error(
        'Cần chạy file supabase/sql/04_webrtc_signaling.sql trên Supabase SQL Editor để dùng phòng học native.'
      );
    }
    throw new Error('Không gửi được tín hiệu kết nối: ' + msg);
  }
}

export async function clearSignals(sessionId) {
  try {
    await supabase.from(SIGNAL_TABLE).delete().eq('session_id', sessionId);
  } catch (e) {
    // best-effort
  }
}
