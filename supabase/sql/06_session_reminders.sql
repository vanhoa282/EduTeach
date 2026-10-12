-- =============================================================================
-- EduTeach: Nhắc buổi học sắp tới (server-side, 30 phút trước giờ học)
-- DÁN VÀO Supabase Dashboard → SQL Editor → RUN. An toàn khi chạy lại.
-- =============================================================================
-- Ghi chú: app cũng đã có nhắc local (lib/notifications.js → syncSessionReminders)
-- nên file này là LỚP BỔ SUNG server-side cho trường hợp app đang bị tắt.
-- =============================================================================

-- Tạo thông báo cho HS + gia sư của các buổi bắt đầu trong vòng 30 phút tới.
CREATE OR REPLACE FUNCTION public.eduteach_remind_upcoming_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row record;
  v_count integer := 0;
BEGIN
  FOR v_row IN
    SELECT
      s.id AS session_id,
      s.session_number,
      s.scheduled_start,
      c.subject,
      c.student_id,
      c.tutor_id
    FROM public.sessions s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.status = 'pending'
      AND s.scheduled_start > now()
      AND s.scheduled_start <= now() + interval '30 minutes'
  LOOP
    -- Học sinh
    IF v_row.student_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_row.student_id
        AND type = 'session_reminder'
        AND ref_id = v_row.session_id
        AND created_at > now() - interval '6 hours'
    ) THEN
      INSERT INTO public.notifications (user_id, title, body, type, ref_id)
      VALUES (
        v_row.student_id,
        'Buổi học sắp bắt đầu',
        'Buổi ' || v_row.session_number || ' môn ' || v_row.subject ||
        ' bắt đầu lúc ' ||
        to_char(v_row.scheduled_start AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') ||
        '. Vào phòng học ngay!',
        'session_reminder',
        v_row.session_id
      );
      v_count := v_count + 1;
    END IF;

    -- Gia sư
    IF v_row.tutor_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = v_row.tutor_id
        AND type = 'session_reminder'
        AND ref_id = v_row.session_id
        AND created_at > now() - interval '6 hours'
    ) THEN
      INSERT INTO public.notifications (user_id, title, body, type, ref_id)
      VALUES (
        v_row.tutor_id,
        'Buổi dạy sắp bắt đầu',
        'Buổi ' || v_row.session_number || ' môn ' || v_row.subject ||
        ' bắt đầu lúc ' ||
        to_char(v_row.scheduled_start AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') ||
        '. Vào phòng học ngay!',
        'session_reminder',
        v_row.session_id
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_remind_upcoming_sessions()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_remind_upcoming_sessions()
TO service_role;

-- pg_cron: mỗi 5 phút (nếu đã bật pg_cron)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'eduteach-session-reminders-5min',
      '*/5 * * * *',
      $fn$SELECT public.eduteach_remind_upcoming_sessions();$fn$
    );
  ELSE
    RAISE NOTICE 'pg_cron chưa bật — bỏ qua lịch cron; app vẫn nhắc qua local notification.';
  END IF;
END;
$$;

SELECT 'EduTeach session reminders SQL applied' AS status;
