-- =============================================================================
-- EduTeach: SIẾT BẢO MẬT signaling WebRTC (thay các policy demo của SQL 04)
-- DÁN TOÀN BỘ FILE NÀY VÀO Supabase Dashboard → SQL Editor → RUN.
-- Project ref: jrkqfalwcleetppqtcvb
-- An toàn khi chạy lại (DROP POLICY / CREATE OR REPLACE FUNCTION).
-- =============================================================================
-- VẤN ĐỀ CỦA SQL 04: policy SELECT/INSERT/DELETE đều USING (true) — bất kỳ ai
-- có anon key (key này nằm công khai trong app) cũng đọc / ghi / XOÁ được
-- tín hiệu kết nối của MỌI buổi học.
--
-- CÁCH SỬA (theo đúng kiến trúc auth hiện tại của EduTeach):
-- - App không dùng Supabase Auth; danh tính tin cậy nằm ở bảng
--   eduteach_auth_sessions (token thô ở máy người dùng, server chỉ lưu
--   sha256(token) — xem supabase/migrations/20261008_auth_sessions.sql).
-- - Client KHÔNG còn chạm thẳng vào bảng signaling_messages. Mọi thao tác
--   đi qua 2 RPC SECURITY DEFINER dưới đây:
--     eduteach_send_signal(p_token, p_session_id, p_kind, p_payload)
--     eduteach_poll_signals(p_token, p_session_id, p_since)
--   RPC tự: (1) hash token → tìm phiên đăng nhập còn hạn + user active,
--           (2) kiểm tra user đó là HỌC SINH hoặc GIA SƯ của buổi học,
--           (3) sender_id do SERVER ghi — client không tự khai được.
-- - RLS trên bảng: bật, KHÔNG có policy nào cho anon/authenticated
--   → PostgREST + Realtime từ client đều bị chặn. (Phía app, polling qua
--   RPC là đường chính; realtime chỉ còn là tuỳ chọn tăng tốc thời demo.)
-- =============================================================================

-- ── 0) Đảm bảo bảng tồn tại (nếu chưa chạy SQL 04) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.signaling_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('offer', 'answer', 'ice', 'leave')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signaling_messages_session_idx
ON public.signaling_messages(session_id, created_at);

-- ── 1) Gỡ toàn bộ policy demo, khoá thẳng bảng với client ────────────────────
DROP POLICY IF EXISTS "signaling_select" ON public.signaling_messages;
DROP POLICY IF EXISTS "signaling_insert" ON public.signaling_messages;
DROP POLICY IF EXISTS "signaling_delete" ON public.signaling_messages;

ALTER TABLE public.signaling_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signaling_messages FROM PUBLIC, anon, authenticated;

-- ── 2) Hàm phụ: xác thực token → user ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.eduteach_verified_user(p_token text)
RETURNS TABLE (verified_user_id uuid, verified_role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.role::text
  FROM public.eduteach_auth_sessions s
  JOIN public.users u ON u.id = s.user_id
  WHERE p_token IS NOT NULL
    AND length(p_token) = 64
    AND s.token_hash = encode(sha256(p_token::bytea), 'hex')
    AND s.revoked_at IS NULL
    AND s.expires_at > now()
    AND u.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.eduteach_verified_user(text) FROM PUBLIC, anon, authenticated;

-- ── 3) Hàm phụ: user có phải HS/gia sư của buổi học không ────────────────────
CREATE OR REPLACE FUNCTION public.eduteach_is_session_participant(
  p_session_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions se
    JOIN public.courses c ON c.id = se.course_id
    WHERE se.id = p_session_id
      AND (c.student_id = p_user_id OR c.tutor_id = p_user_id)
  );
$$;

REVOKE ALL ON FUNCTION public.eduteach_is_session_participant(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ── 4) RPC gửi tín hiệu ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.eduteach_send_signal(
  p_token text,
  p_session_id uuid,
  p_kind text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_id uuid;
BEGIN
  SELECT verified_user_id INTO v_user_id
  FROM public.eduteach_verified_user(p_token);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Phiên đăng nhập không hợp lệ' USING ERRCODE = '28000';
  END IF;

  IF p_kind NOT IN ('offer', 'answer', 'ice', 'leave') THEN
    RAISE EXCEPTION 'Loại tín hiệu không hợp lệ' USING ERRCODE = '22023';
  END IF;

  IF NOT public.eduteach_is_session_participant(p_session_id, v_user_id) THEN
    RAISE EXCEPTION 'Bạn không thuộc buổi học này' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.signaling_messages (session_id, sender_id, kind, payload)
  VALUES (p_session_id, v_user_id, p_kind, COALESCE(p_payload, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eduteach_send_signal(text, uuid, text, jsonb)
TO anon, authenticated;

-- ── 5) RPC nhận tín hiệu (polling) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.eduteach_poll_signals(
  p_token text,
  p_session_id uuid,
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  sender_id uuid,
  kind text,
  payload jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT verified_user_id INTO v_user_id
  FROM public.eduteach_verified_user(p_token);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Phiên đăng nhập không hợp lệ' USING ERRCODE = '28000';
  END IF;

  IF NOT public.eduteach_is_session_participant(p_session_id, v_user_id) THEN
    RAISE EXCEPTION 'Bạn không thuộc buổi học này' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.id, m.session_id, m.sender_id, m.kind, m.payload, m.created_at
  FROM public.signaling_messages m
  WHERE m.session_id = p_session_id
    AND (p_since IS NULL OR m.created_at > p_since)
  ORDER BY m.created_at ASC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eduteach_poll_signals(text, uuid, timestamptz)
TO anon, authenticated;

-- ── 6) Dọn tín hiệu cũ (gọi tay, hoặc lên lịch bằng pg_cron nếu muốn) ─────────
CREATE OR REPLACE FUNCTION public.eduteach_cleanup_signals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.signaling_messages
  WHERE created_at < now() - interval '1 hour';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_cleanup_signals() FROM PUBLIC, anon, authenticated;

SELECT public.eduteach_cleanup_signals() AS old_signals_removed;
SELECT 'EduTeach WebRTC signaling hardened (SQL 08) applied' AS status;
