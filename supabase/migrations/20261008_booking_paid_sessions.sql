-- EduTeach: hợp nhất chốt lịch và tạo buổi học.
-- Thay thế nội dung hàm trigger hiện có, giữ nguyên tên trigger.
-- Chỉ áp dụng logic sessions cho đơn có booking_slot_locks.

CREATE OR REPLACE FUNCTION public.sync_booking_locks_on_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lock_count integer;
  v_expected integer;
  v_existing integer;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'paid'
     AND OLD.status = 'pending'
  THEN
    SELECT count(*)
    INTO v_lock_count
    FROM public.booking_slot_locks
    WHERE order_id = NEW.id;

    -- Đơn cũ không có booking locks: giữ nguyên cách xử lý cũ.
    IF v_lock_count = 0 THEN
      RETURN NEW;
    END IF;

    IF OLD.expires_at IS NULL OR OLD.expires_at <= now() THEN
      RAISE EXCEPTION 'BOOKING_ORDER_EXPIRED';
    END IF;

    IF NEW.paid_at IS NULL THEN
      RAISE EXCEPTION 'BOOKING_PAYMENT_TIME_MISSING';
    END IF;

    IF NEW.paid_at > OLD.expires_at THEN
      RAISE EXCEPTION 'BOOKING_PAYMENT_AFTER_EXPIRY';
    END IF;

    SELECT total_sessions
    INTO v_expected
    FROM public.courses
    WHERE id = NEW.course_id
      AND student_id = NEW.student_id;

    IF v_expected IS NULL
       OR v_expected NOT IN (10, 20, 30)
       OR v_expected <> v_lock_count THEN
      RAISE EXCEPTION 'BOOKING_SESSION_COUNT_MISMATCH';
    END IF;

    -- Tất cả lịch phải còn ở trạng thái held.
    IF EXISTS (
      SELECT 1
      FROM public.booking_slot_locks
      WHERE order_id = NEW.id
        AND (
          status <> 'held'
          OR expires_at IS NULL
          OR expires_at <= now()
        )
    ) THEN
      RAISE EXCEPTION 'BOOKING_HOLD_INVALID';
    END IF;

    SELECT count(*)
    INTO v_existing
    FROM public.sessions
    WHERE course_id = NEW.course_id;

    IF v_existing <> 0 THEN
      RAISE EXCEPTION 'BOOKING_SESSIONS_ALREADY_EXIST';
    END IF;

    INSERT INTO public.sessions (
      course_id,
      session_number,
      scheduled_at,
      scheduled_start,
      scheduled_end,
      status
    )
    SELECT
      NEW.course_id,
      row_number() OVER (
        ORDER BY l.start_at, l.id
      )::integer,
      l.start_at,
      l.start_at,
      l.end_at,
      'pending'
    FROM public.booking_slot_locks l
    WHERE l.order_id = NEW.id;

    UPDATE public.booking_slot_locks
    SET status = 'booked',
        expires_at = NULL
    WHERE order_id = NEW.id
      AND status = 'held';

  ELSIF NEW.status IN ('cancelled', 'expired') THEN

    UPDATE public.booking_slot_locks
    SET status = 'released'
    WHERE order_id = NEW.id
      AND status = 'held';

  END IF;

  RETURN NEW;
END;
$$;

-- Xóa trigger mới ở bản dự thảo nếu đã từng tạo.
DROP TRIGGER IF EXISTS eduteach_finalize_paid_booking_trigger
ON public.orders;

-- Trigger gốc trg_sync_booking_locks_on_order vẫn được giữ nguyên.
