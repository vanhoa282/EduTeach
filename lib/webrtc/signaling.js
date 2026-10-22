import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import { signalingChannelName } from './session';
import { AUTH_SESSION_KEY } from '../auth/serverLogin';

// ── Signaling cho phòng học WebRTC native ────────────────────────────────────
// Trao đổi SDP/ICE qua bảng signaling_messages (SQL 04 tạo bảng, SQL 08 siết
// bảo mật). Hai đường:
//   1) ƯU TIÊN — RPC bảo mật (SQL 08): eduteach_send_signal /
//      eduteach_poll_signals xác thực bằng token phiên đăng nhập
//      (x-eduteach-session, hash sha256 so với eduteach_auth_sessions) và
//      kiểm tra người gọi CÓ PHẢI học sinh/gia sư của buổi học hay không.
//      Client KHÔNG còn đọc/ghi thẳng vào bảng được nữa.
//   2) FALLBACK — khi chưa chạy SQL 08 (RPC chưa tồn tại): quay về đọc/ghi
//      thẳng như bản cũ để app vẫn chạy trong lúc chuyển đổi.
// Realtime postgres_changes chỉ còn là kênh tăng tốc tuỳ chọn: sau SQL 08,
// RLS chặn anon nên realtime sẽ im lặng — POLLING (1.2s) là đường chính và
// đủ nhanh cho trao đổi offer/answer/ICE của lớp 1-1.

const SIGNAL_TABLE = 'signaling_messages';
const POLL_INTERVAL_MS = 1200;

let rpcAvailable = null; // null = chưa biết, true/false sau lần gọi đầu

async function getSessionToken() {
  try {
    const t = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    return t && /^[a-f0-9]{64}$/.test(t) ? t : null;
  } catch (e) {
    return null;
  }
}

function isMissingRpc(error) {
  const msg = (error?.message || '') + ' ' + (error?.code || '');
  return /PGRST202|Could not find the function|404/i.test(msg);
}

export function subscribeSignaling(sessionId, currentUserId, onMessage) {
  // Tương thích ngược: bản cũ gọi subscribeSignaling(sessionId, callback) —
  // màn hình tự lọc tín hiệu của chính mình trong callback.
  if (typeof currentUserId === 'function' && !onMessage) {
    onMessage = currentUserId;
    currentUserId = null;
  }
  const seen = new Set(); // dedupe giữa realtime + polling
  let stopped = false;
  let pollTimer = null;
  let lastSeenTs = new Date().toISOString();

  const deliver = (row) => {
    if (!row || !row.id || seen.has(row.id)) return;
    if (currentUserId && row.sender_id === currentUserId) return; // bỏ tín hiệu của chính mình
    seen.add(row.id);
    try {
      onMessage(row);
    } catch (e) {
      // không để lỗi callback làm chết kênh
    }
  };

  // 1) Realtime (tăng tốc nếu RLS còn cho phép — xem ghi chú đầu file)
  let channel = null;
  try {
    channel = supabase
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
  } catch (e) {}

  // 2) Polling — đường chính
  const poll = async () => {
    if (stopped) return;
    try {
      let rows = null;

      if (rpcAvailable !== false) {
        const token = await getSessionToken();
        if (token) {
          const { data, error } = await supabase.rpc('eduteach_poll_signals', {
            p_token: token,
            p_session_id: sessionId,
            p_since: lastSeenTs,
          });
          if (!error) {
            rpcAvailable = true;
            rows = data || [];
          } else if (isMissingRpc(error)) {
            rpcAvailable = false;
          }
        }
      }

      if (rows === null) {
        const { data } = await supabase
          .from(SIGNAL_TABLE)
          .select('*')
          .eq('session_id', sessionId)
          .gt('created_at', lastSeenTs)
          .order('created_at', { ascending: true })
          .limit(50);
        rows = data || [];
      }

      for (const row of rows) {
        if (row.created_at > lastSeenTs) lastSeenTs = row.created_at;
        deliver(row);
      }
    } catch (e) {
      // mất mạng tạm thời → bỏ qua, lần poll sau sẽ lấy tiếp
    }

    if (!stopped) pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  };
  pollTimer = setTimeout(poll, 800);

  return {
    unsubscribe() {
      stopped = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (channel) {
        try { supabase.removeChannel(channel); } catch (e) {}
      }
    },
  };
}

export async function sendSignal(sessionId, senderId, kind, payload) {
  // Đường bảo mật (SQL 08): server tự suy ra sender từ token — client
  // KHÔNG tự khai sender_id được nữa.
  if (rpcAvailable !== false) {
    const token = await getSessionToken();
    if (token) {
      const { error } = await supabase.rpc('eduteach_send_signal', {
        p_token: token,
        p_session_id: sessionId,
        p_kind: kind,
        p_payload: payload || {},
      });
      if (!error) {
        rpcAvailable = true;
        return;
      }
      if (!isMissingRpc(error)) {
        throw new Error('Không gửi được tín hiệu kết nối: ' + (error.message || 'bị từ chối'));
      }
      rpcAvailable = false;
    }
  }

  // Fallback (chưa chạy SQL 08)
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
  // Sau SQL 08 client không xoá thẳng được nữa — tín hiệu tự hết hạn 1 giờ
  // (eduteach_cleanup_signals). Hàm giữ lại để tương thích lời gọi cũ:
  // thử xoá, thất bại thì bỏ qua.
  try {
    await supabase.from(SIGNAL_TABLE).delete().eq('session_id', sessionId);
  } catch (e) {
    // best-effort
  }
}
