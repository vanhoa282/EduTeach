-- =============================================================================
-- EduTeach: Signaling cho phòng học WebRTC native (1 gia sư + 1 học sinh)
-- DÁN TOÀN BỘ FILE NÀY VÀO Supabase Dashboard → SQL Editor → RUN.
-- Project ref: jrkqfalwcleetppqtcvb
-- An toàn khi chạy lại (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================================
-- Trao đổi SDP/ICE qua Supabase Realtime (postgres_changes) — KHÔNG cần
-- WebSocket riêng, KHÔNG cần Edge Function, KHÔNG dùng dịch vụ bên thứ 3.
-- Tín hiệu là dữ liệu tạm: 2 máy phải online cùng lúc (đúng mô hình phòng học).
-- =============================================================================

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

ALTER TABLE public.signaling_messages ENABLE ROW LEVEL SECURITY;

-- Demo: app dùng anon key nên cho phép gửi/nhận tín hiệu.
-- Production: thay bằng policy kiểm tra người gửi là HS/gia sư của session đó.
DROP POLICY IF EXISTS "signaling_select" ON public.signaling_messages;
CREATE POLICY "signaling_select"
ON public.signaling_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "signaling_insert" ON public.signaling_messages;
CREATE POLICY "signaling_insert"
ON public.signaling_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "signaling_delete" ON public.signaling_messages;
CREATE POLICY "signaling_delete"
ON public.signaling_messages FOR DELETE USING (true);

-- Đảm bảo bảng nằm trong publication realtime để postgres_changes gửi sự kiện.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'signaling_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.signaling_messages;
  END IF;
END;
$$;

-- Dọn tín hiệu quá 1 giờ (app cũng tự dọn khi rời phòng).
DELETE FROM public.signaling_messages
WHERE created_at < now() - interval '1 hour';

SELECT 'EduTeach WebRTC signaling SQL applied' AS status;
