-- =============================================================================
-- EduTeach: Tránh đụng lịch (booking locks + atomic create) — dán vào Supabase SQL Editor
-- Chạy 1 lần trên project demo. An toàn khi chạy lại (IF NOT EXISTS / OR REPLACE).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Cột thời gian buổi học (tương thích đơn cũ + đơn mới)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz;

UPDATE public.sessions
SET scheduled_start = coalesce(scheduled_start, scheduled_at)
WHERE scheduled_start IS NULL AND scheduled_at IS NOT NULL;

UPDATE public.sessions
SET scheduled_end = coalesce(
  scheduled_end,
  coalesce(scheduled_start, scheduled_at) + interval '2 hours'
)
WHERE scheduled_end IS NULL
  AND coalesce(scheduled_start, scheduled_at) IS NOT NULL;

-- Bảng giữ chỗ lịch (held 30 phút / booked sau thanh toán)
CREATE TABLE IF NOT EXISTS public.booking_slot_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'held',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_slot_locks_valid_status'
      AND conrelid = 'public.booking_slot_locks'::regclass
  ) THEN
    ALTER TABLE public.booking_slot_locks
      ADD CONSTRAINT booking_slot_locks_valid_status
      CHECK (status IN ('held', 'booked', 'released'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_slot_locks_valid_time'
      AND conrelid = 'public.booking_slot_locks'::regclass
  ) THEN
    ALTER TABLE public.booking_slot_locks
      ADD CONSTRAINT booking_slot_locks_valid_time
      CHECK (end_at > start_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
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

CREATE INDEX IF NOT EXISTS booking_slot_locks_tutor_time_idx
ON public.booking_slot_locks(tutor_id, start_at, end_at)
WHERE status IN ('held', 'booked');

CREATE INDEX IF NOT EXISTS booking_slot_locks_order_idx
ON public.booking_slot_locks(order_id);

-- Chống chồng lịch cứng ở DB (sau khi đã release hold hết hạn)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_slot_locks_no_overlap'
      AND conrelid = 'public.booking_slot_locks'::regclass
  ) THEN
    ALTER TABLE public.booking_slot_locks
      ADD CONSTRAINT booking_slot_locks_no_overlap
      EXCLUDE USING gist (
        tutor_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
      )
      WHERE (status IN ('held', 'booked'));
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'EXCLUDE constraint skipped (có thể đang có dữ liệu chồng). Hãy dọn locks rồi chạy lại phần này.';
END;
$$;

ALTER TABLE public.booking_slot_locks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.booking_slot_locks
FROM PUBLIC, anon, authenticated;

-- Auth session (cần cho booking-create / auth-login)
CREATE TABLE IF NOT EXISTS public.eduteach_auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS eduteach_auth_sessions_user_idx
ON public.eduteach_auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS eduteach_auth_sessions_expiry_idx
ON public.eduteach_auth_sessions(expires_at);

ALTER TABLE public.eduteach_auth_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.eduteach_auth_sessions
FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.eduteach_login_attempts (
  phone_hash text PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eduteach_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.eduteach_login_attempts
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.eduteach_record_login_failure(
  p_phone_hash text
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_blocked_until timestamptz;
BEGIN
  INSERT INTO public.eduteach_login_attempts AS a (
    phone_hash, failures, window_started_at,
    blocked_until, updated_at
  )
  VALUES (p_phone_hash, 1, now(), NULL, now())
  ON CONFLICT (phone_hash)
  DO UPDATE SET
    failures = CASE
      WHEN a.window_started_at < now() - interval '15 minutes'
      THEN 1
      ELSE a.failures + 1
    END,
    window_started_at = CASE
      WHEN a.window_started_at < now() - interval '15 minutes'
      THEN now()
      ELSE a.window_started_at
    END,
    blocked_until = CASE
      WHEN a.window_started_at >= now() - interval '15 minutes'
           AND a.failures + 1 >= 5
      THEN now() + interval '15 minutes'
      ELSE NULL
    END,
    updated_at = now()
  RETURNING blocked_until INTO v_blocked_until;

  RETURN v_blocked_until;
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_record_login_failure(text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_record_login_failure(text)
TO service_role;

-- Dọn hold hết hạn
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

-- =============================================================================
-- Atomic booking (giữ chỗ + chống đụng lịch trong 1 transaction)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.eduteach_create_booking_atomic(
  p_student_id uuid,
  p_tutor_id uuid,
  p_subject text,
  p_slots jsonb,
  p_payment_type text DEFAULT 'full'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
  v_price integer;
  v_total integer;
  v_discount numeric;
  v_pay_now integer;
  v_course_id uuid;
  v_order_id uuid;
  v_order_code text;
  v_slot jsonb;
  v_start timestamptz;
  v_end timestamptz;
  v_index integer := 0;
  v_attempt integer;
  v_schedule jsonb;
  v_weekday text;
  v_hour integer;
  v_allowed jsonb;
  v_commission_rate numeric;
  v_student_role text;
  v_tutor_role text;
  v_checked_slots tstzrange[] := ARRAY[]::tstzrange[];
  v_range tstzrange;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('student:' || p_student_id::text, 0)
  );
  PERFORM pg_advisory_xact_lock(
    hashtextextended('tutor:' || p_tutor_id::text, 0)
  );

  SELECT role::text INTO v_student_role
  FROM public.users
  WHERE id = p_student_id AND status = 'active';

  SELECT role::text INTO v_tutor_role
  FROM public.users
  WHERE id = p_tutor_id AND status = 'active';

  IF v_student_role <> 'student'
     OR v_tutor_role <> 'tutor'
     OR p_student_id = p_tutor_id
     OR v_student_role IS NULL
     OR v_tutor_role IS NULL THEN
    RAISE EXCEPTION 'INVALID_BOOKING_USERS';
  END IF;

  IF jsonb_typeof(p_slots) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_SLOTS';
  END IF;

  v_count := jsonb_array_length(p_slots);

  IF v_count NOT IN (10, 20, 30) THEN
    RAISE EXCEPTION 'INVALID_SESSION_COUNT';
  END IF;

  IF p_payment_type NOT IN ('full', 'half') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_TYPE';
  END IF;

  SELECT price_per_session, available_slots
  INTO v_price, v_schedule
  FROM public.tutor_profiles
  WHERE user_id = p_tutor_id;

  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'INVALID_TUTOR_PRICE';
  END IF;

  IF v_schedule IS NULL THEN
    RAISE EXCEPTION 'TUTOR_HAS_NO_AVAILABILITY';
  END IF;

  IF (
    SELECT count(*)
    FROM public.orders
    WHERE student_id = p_student_id
      AND status = 'pending'
      AND expires_at > now()
  ) >= 2 THEN
    RAISE EXCEPTION 'TOO_MANY_PENDING_ORDERS';
  END IF;

  UPDATE public.booking_slot_locks AS l
  SET status = 'released'
  FROM public.orders AS o
  WHERE l.order_id = o.id
    AND l.tutor_id = p_tutor_id
    AND l.status = 'held'
    AND o.status = 'pending'
    AND o.expires_at <= now();

  v_discount := CASE v_count
    WHEN 20 THEN 0.05
    WHEN 30 THEN 0.10
    ELSE 0
  END;

  v_total := round(v_price * v_count * (1 - v_discount));
  v_pay_now := CASE
    WHEN p_payment_type = 'half'
    THEN ceil(v_total::numeric / 2)::integer
    ELSE v_total
  END;

  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_slots)
  LOOP
    IF jsonb_typeof(v_slot) <> 'object'
       OR NOT (v_slot ? 'start_at')
       OR NOT (v_slot ? 'end_at') THEN
      RAISE EXCEPTION 'INVALID_SLOT_FORMAT';
    END IF;

    v_start := (v_slot->>'start_at')::timestamptz;
    v_end := (v_slot->>'end_at')::timestamptz;

    IF v_start <= now()
       OR v_start > now() + interval '180 days'
       OR v_end <> v_start + interval '2 hours' THEN
      RAISE EXCEPTION 'INVALID_SLOT_TIME';
    END IF;

    v_weekday := extract(
      dow FROM v_start AT TIME ZONE 'Asia/Ho_Chi_Minh'
    )::integer::text;

    v_hour := extract(
      hour FROM v_start AT TIME ZONE 'Asia/Ho_Chi_Minh'
    )::integer;

    IF NOT isfinite(v_start)
       OR NOT isfinite(v_end)
       OR extract(
         second FROM v_start AT TIME ZONE 'Asia/Ho_Chi_Minh'
       ) <> 0 THEN
      RAISE EXCEPTION 'INVALID_SLOT_TIMESTAMP';
    END IF;

    IF extract(
      minute FROM v_start AT TIME ZONE 'Asia/Ho_Chi_Minh'
    ) <> 0 THEN
      RAISE EXCEPTION 'INVALID_SLOT_MINUTE';
    END IF;

    v_allowed := v_schedule->v_weekday;

    IF v_allowed IS NULL
       OR jsonb_typeof(v_allowed) <> 'array'
       OR NOT (v_allowed @> jsonb_build_array(v_hour)) THEN
      RAISE EXCEPTION 'SLOT_NOT_IN_TUTOR_SCHEDULE';
    END IF;

    v_range := tstzrange(v_start, v_end, '[)');

    IF EXISTS (
      SELECT 1
      FROM unnest(v_checked_slots) AS previous_slot
      WHERE previous_slot && v_range
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_OR_OVERLAPPING_SLOTS';
    END IF;

    v_checked_slots := array_append(v_checked_slots, v_range);

    IF EXISTS (
      SELECT 1
      FROM public.booking_slot_locks l
      WHERE l.tutor_id = p_tutor_id
        AND l.start_at < v_end
        AND l.end_at > v_start
        AND (
          l.status = 'booked'
          OR (
            l.status = 'held'
            AND l.expires_at IS NOT NULL
            AND l.expires_at > now()
          )
        )
    ) THEN
      RAISE EXCEPTION 'SLOT_ALREADY_BOOKED';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.sessions s
      JOIN public.courses c ON c.id = s.course_id
      WHERE c.tutor_id = p_tutor_id
        AND c.status IS DISTINCT FROM 'cancelled'
        AND s.status IS DISTINCT FROM 'cancelled'
        AND coalesce(s.scheduled_start, s.scheduled_at) < v_end
        AND coalesce(
          s.scheduled_end,
          coalesce(s.scheduled_start, s.scheduled_at)
            + interval '2 hours'
        ) > v_start
    ) THEN
      RAISE EXCEPTION 'LEGACY_SESSION_CONFLICT';
    END IF;
  END LOOP;

  SELECT value::numeric INTO v_commission_rate
  FROM public.settings
  WHERE key = 'commission_rate';

  v_commission_rate := coalesce(v_commission_rate, 10);

  IF v_commission_rate < 0 OR v_commission_rate > 50 THEN
    RAISE EXCEPTION 'INVALID_COMMISSION_RATE';
  END IF;

  INSERT INTO public.courses (
    student_id, tutor_id, subject,
    total_sessions, price_per_session,
    total_price, payment_type, paid_amount,
    commission_rate, status, schedule
  )
  VALUES (
    p_student_id, p_tutor_id, p_subject,
    v_count, v_price, v_total,
    p_payment_type, 0,
    v_commission_rate, 'pending_payment', p_slots::text
  )
  RETURNING id INTO v_course_id;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('eduteach:order_code', 0)
  );

  v_order_code := NULL;

  FOR v_attempt IN 1..100 LOOP
    v_order_code := 'EDT' ||
      floor(random() * 900000 + 100000)::integer::text;

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.orders
      WHERE order_code = v_order_code
    );
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.orders
    WHERE order_code = v_order_code
  ) THEN
    RAISE EXCEPTION 'ORDER_CODE_UNAVAILABLE';
  END IF;

  INSERT INTO public.orders (
    order_code, student_id, course_id,
    amount, status, expires_at
  )
  VALUES (
    v_order_code, p_student_id, v_course_id,
    v_pay_now, 'pending', now() + interval '30 minutes'
  )
  RETURNING id INTO v_order_id;

  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_slots)
  LOOP
    v_index := v_index + 1;

    INSERT INTO public.booking_slot_locks (
      tutor_id, student_id, course_id,
      order_id, start_at, end_at,
      status, expires_at
    )
    VALUES (
      p_tutor_id, p_student_id, v_course_id,
      v_order_id,
      (v_slot->>'start_at')::timestamptz,
      (v_slot->>'end_at')::timestamptz,
      'held', now() + interval '30 minutes'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'course_id', v_course_id,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'expires_at', (
      SELECT o.expires_at
      FROM public.orders o
      WHERE o.id = v_order_id
    ),
    'amount', v_pay_now,
    'total_price', v_total,
    'sessions', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_create_booking_atomic(
  uuid, uuid, text, jsonb, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_create_booking_atomic(
  uuid, uuid, text, jsonb, text
) TO service_role;

-- =============================================================================
-- Khi đơn paid: tạo sessions từ locks; khi cancel/expired: nhả hold
-- =============================================================================
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

DROP TRIGGER IF EXISTS eduteach_finalize_paid_booking_trigger
ON public.orders;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_booking_locks_on_order'
  ) THEN
    CREATE TRIGGER trg_sync_booking_locks_on_order
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_booking_locks_on_order_update();
  END IF;
END;
$$;

SELECT 'EduTeach booking conflict SQL applied' AS status;
