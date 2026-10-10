-- =============================================================================
-- EduTeach: Phòng học + Huỷ buổi trước 24h + Đổi giờ buổi
-- DÁN TOÀN BỘ FILE NÀY VÀO Supabase Dashboard → SQL Editor → RUN.
-- Project ref: jrkqfalwcleetppqtcvb
-- An toàn khi chạy lại (IF NOT EXISTS / OR REPLACE).
-- LƯU Ý: CHẠY SAU 02_booking_conflict_ready.sql (cần cột sessions.scheduled_start
--       + bảng booking_slot_locks + eduteach_auth_sessions).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cột ghi nhận thời điểm huỷ / đổi giờ (dùng cho thống kê, hỗ trợ)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;

CREATE INDEX IF NOT EXISTS sessions_scheduled_start_idx
ON public.sessions(scheduled_start)
WHERE status IS DISTINCT FROM 'cancelled';

-- =============================================================================
-- Lấy user_id từ header x-eduteach-session (token login qua Edge auth-login).
-- Dùng để chống giả mạo: client gọi RPC phải gửi đúng phiên của chính mình.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.eduteach_session_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.user_id
  FROM public.eduteach_auth_sessions s
  WHERE s.token_hash = encode(
    digest(
      coalesce(nullif((
        (coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json)
          ->> 'x-eduteach-session'
      ), ''), ''),
      'sha256'
    ),
    'hex'
  )
    AND s.revoked_at IS NULL
    AND s.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.eduteach_session_user_id()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_session_user_id()
TO anon, authenticated;

-- =============================================================================
-- HUỶ BUỔI HỌC (chỉ học sinh của buổi, trước giờ học >= 24h)
-- Trả khung giờ về lịch trống (release lock 'booked').
-- =============================================================================
CREATE OR REPLACE FUNCTION public.eduteach_cancel_session(
  p_session_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_header_user uuid;
BEGIN
  IF p_session_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Thiếu thông tin buổi học.');
  END IF;

  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Không tìm thấy buổi học.');
  END IF;

  SELECT * INTO v_course
  FROM public.courses
  WHERE id = v_session.course_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Không tìm thấy khóa học.');
  END IF;

  IF p_user_id <> v_course.student_id THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Bạn không phải học sinh của buổi học này.');
  END IF;

  v_header_user := public.eduteach_session_user_id();
  IF v_header_user IS NOT NULL AND v_header_user <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Phiên đăng nhập không khớp. Vui lòng đăng nhập lại.');
  END IF;

  -- Cùng cấp khoá advisory với booking-create để tránh đua dữ liệu.
  PERFORM pg_advisory_xact_lock(hashtextextended('tutor:' || v_course.tutor_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('student:' || v_course.student_id::text, 0));

  IF v_session.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Chỉ huỷ được buổi chưa học.');
  END IF;

  IF v_session.scheduled_start IS NULL
     OR v_session.scheduled_start <= now() + interval '24 hours' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Chỉ được huỷ buổi trước giờ học ít nhất 24 giờ.');
  END IF;

  UPDATE public.sessions
  SET status = 'cancelled',
      cancelled_at = now()
  WHERE id = p_session_id
    AND status = 'pending';

  UPDATE public.booking_slot_locks
  SET status = 'released'
  WHERE course_id = v_session.course_id
    AND status = 'booked'
    AND start_at = v_session.scheduled_start
    AND end_at = v_session.scheduled_end;

  RETURN jsonb_build_object('ok', true, 'message', 'Đã huỷ buổi học.');
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_cancel_session(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_cancel_session(uuid, uuid)
TO anon, authenticated;

-- =============================================================================
-- ĐỔI GIỜ BUỔI HỌC (chỉ học sinh của buổi, trước giờ học >= 24h)
-- Kiểm tra lại: giờ mới thuộc lịch rảnh gia sư + không chồng locks/sessions.
-- Các buổi khác trong khoá được giữ nguyên.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.eduteach_reschedule_session(
  p_session_id uuid,
  p_user_id uuid,
  p_new_start timestamptz,
  p_new_end timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_header_user uuid;
  v_weekday text;
  v_hour integer;
  v_allowed jsonb;
BEGIN
  IF p_session_id IS NULL OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Thiếu thông tin buổi học.');
  END IF;

  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Không tìm thấy buổi học.');
  END IF;

  SELECT * INTO v_course
  FROM public.courses
  WHERE id = v_session.course_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Không tìm thấy khóa học.');
  END IF;

  IF p_user_id <> v_course.student_id THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Bạn không phải học sinh của buổi học này.');
  END IF;

  v_header_user := public.eduteach_session_user_id();
  IF v_header_user IS NOT NULL AND v_header_user <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Phiên đăng nhập không khớp. Vui lòng đăng nhập lại.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('tutor:' || v_course.tutor_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('student:' || v_course.student_id::text, 0));

  IF v_session.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Chỉ đổi giờ buổi chưa học.');
  END IF;

  IF v_session.scheduled_start IS NULL
     OR v_session.scheduled_start <= now() + interval '24 hours' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Chỉ đổi giờ trước giờ học ít nhất 24 giờ.');
  END IF;

  IF p_new_start IS NULL OR p_new_end IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Thiếu khung giờ mới.');
  END IF;

  IF p_new_start <= now()
     OR p_new_start > now() + interval '180 days' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Khung giờ mới không hợp lệ.');
  END IF;

  IF p_new_end IS DISTINCT FROM p_new_start + interval '2 hours' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Buổi học phải dài đúng 2 giờ.');
  END IF;

  v_weekday := extract(
    dow FROM p_new_start AT TIME ZONE 'Asia/Ho_Chi_Minh'
  )::integer::text;

  v_hour := extract(
    hour FROM p_new_start AT TIME ZONE 'Asia/Ho_Chi_Minh'
  )::integer;

  SELECT available_slots INTO v_allowed
  FROM public.tutor_profiles
  WHERE user_id = v_course.tutor_id;

  IF v_allowed IS NULL
     OR jsonb_typeof(v_allowed->v_weekday) <> 'array'
     OR NOT ((v_allowed->v_weekday) @> jsonb_build_array(v_hour)) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Khung giờ mới không nằm trong lịch rảnh của gia sư.');
  END IF;

  -- Không chồng locks đang giữ/đã đặt (trừ lock của chính buổi này)
  IF EXISTS (
    SELECT 1
    FROM public.booking_slot_locks l
    WHERE l.tutor_id = v_course.tutor_id
      AND l.start_at < p_new_end
      AND l.end_at > p_new_start
      AND (
        l.status = 'booked'
        OR (
          l.status = 'held'
          AND l.expires_at IS NOT NULL
          AND l.expires_at > now()
        )
      )
      AND NOT (
        l.course_id = v_session.course_id
        AND l.status = 'booked'
        AND l.start_at = v_session.scheduled_start
        AND l.end_at = v_session.scheduled_end
      )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Khung giờ mới đã có người đặt.');
  END IF;

  -- Không chồng buổi học khác của gia sư
  IF EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.courses c ON c.id = s.course_id
    WHERE c.tutor_id = v_course.tutor_id
      AND s.status IS DISTINCT FROM 'cancelled'
      AND s.id <> p_session_id
      AND coalesce(s.scheduled_start, s.scheduled_at) < p_new_end
      AND coalesce(
        s.scheduled_end,
        coalesce(s.scheduled_start, s.scheduled_at) + interval '2 hours'
      ) > p_new_start
  ) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Khung giờ mới trùng với buổi học khác của gia sư.');
  END IF;

  UPDATE public.sessions
  SET scheduled_at = p_new_start,
      scheduled_start = p_new_start,
      scheduled_end = p_new_end,
      rescheduled_at = now()
  WHERE id = p_session_id
    AND status = 'pending';

  UPDATE public.booking_slot_locks
  SET start_at = p_new_start,
      end_at = p_new_end
  WHERE course_id = v_session.course_id
    AND status = 'booked'
    AND start_at = v_session.scheduled_start
    AND end_at = v_session.scheduled_end;

  RETURN jsonb_build_object('ok', true, 'message', 'Đã đổi giờ buổi học.');
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_reschedule_session(uuid, uuid, timestamptz, timestamptz)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_reschedule_session(uuid, uuid, timestamptz, timestamptz)
TO anon, authenticated;

SELECT 'EduTeach classroom + cancel + reschedule SQL applied' AS status;
