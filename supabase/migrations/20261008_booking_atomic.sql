-- EduTeach atomic booking
-- Chỉ backend service_role được phép gọi.
-- Giữ đủ tất cả buổi hoặc rollback toàn bộ.

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
  -- Khóa theo gia sư, tránh hai giao dịch đặt đồng thời.
  -- Khoa theo hoc vien truoc, gia su sau.
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

  -- Giới hạn hai đơn chưa thanh toán.
  IF (
    SELECT count(*)
    FROM public.orders
    WHERE student_id = p_student_id
      AND status = 'pending'
      AND expires_at > now()
  ) >= 2 THEN
    RAISE EXCEPTION 'TOO_MANY_PENDING_ORDERS';
  END IF;

  -- Giải phóng các khóa hết hạn của gia sư này.
  UPDATE public.booking_slot_locks AS l
  SET status = 'released'
  FROM public.orders AS o
  WHERE l.order_id = o.id
    AND l.tutor_id = p_tutor_id
    AND l.status = 'held'
    AND o.status = 'pending'
    AND o.expires_at <= now();

  -- Giá do server tính, không tin giá gửi từ ứng dụng.
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

  -- Kiểm tra từng buổi.
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

    -- Giờ Việt Nam: Chủ nhật = 0.
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

    -- Khong cho cac buoi trong cung don trung nhau.
    v_range := tstzrange(v_start, v_end, '[)');

    IF EXISTS (
      SELECT 1
      FROM unnest(v_checked_slots) AS previous_slot
      WHERE previous_slot && v_range
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_OR_OVERLAPPING_SLOTS';
    END IF;

    v_checked_slots := array_append(v_checked_slots, v_range);

    -- Kiểm tra khóa đã giữ (còn hạn) và buổi đã đặt.
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

  -- Tạo khóa học.
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

  -- Mã đơn ngẫu nhiên để giảm khả năng trùng.
  -- Ma EDT + 6 chu so, tuong thich API5S.
  -- Khoa giao dich tren khong gian ma de tranh sinh trung dong thoi.
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

  -- Tạo đủ khóa giữ chỗ.
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
