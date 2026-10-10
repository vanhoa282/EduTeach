-- EduTeach: booking lock hardening
-- Requires existing public.booking_slot_locks table.

-- Chỉ cho phép trạng thái hợp lệ.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_slot_locks_valid_status'
      AND conrelid = 'public.booking_slot_locks'::regclass
  ) THEN
    ALTER TABLE public.booking_slot_locks
    ADD CONSTRAINT booking_slot_locks_valid_status
    CHECK (status IN ('held', 'booked', 'released'));
  END IF;
END;
$$;

-- Thời gian kết thúc phải sau thời gian bắt đầu.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_slot_locks_valid_time'
      AND conrelid = 'public.booking_slot_locks'::regclass
  ) THEN
    ALTER TABLE public.booking_slot_locks
    ADD CONSTRAINT booking_slot_locks_valid_time
    CHECK (end_at > start_at);
  END IF;
END;
$$;

-- Mỗi khoảng giữ chỗ hoặc đã đặt phải gắn với đơn và khóa học.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_slot_locks_valid_owner'
      AND conrelid = 'public.booking_slot_locks'::regclass
  ) THEN
    ALTER TABLE public.booking_slot_locks
    ADD CONSTRAINT booking_slot_locks_valid_owner
    CHECK (
      status = 'released'
      OR (course_id IS NOT NULL AND order_id IS NOT NULL)
    );
  END IF;
END;
$$;

-- Hỗ trợ truy vấn lịch đang bận.
CREATE INDEX IF NOT EXISTS booking_slot_locks_tutor_time_idx
ON public.booking_slot_locks(tutor_id, start_at, end_at)
WHERE status IN ('held', 'booked');

-- Hàm dọn các đơn giữ lịch đã hết hạn.
-- Chỉ service_role được gọi.
CREATE OR REPLACE FUNCTION public.eduteach_release_expired_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.booking_slot_locks AS l
  SET status = 'released'
  FROM public.orders AS o
  WHERE l.order_id = o.id
    AND l.status = 'held'
    AND o.status = 'pending'
    AND o.expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_release_expired_holds()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_release_expired_holds()
TO service_role;
