-- EduTeach booking payment safety checks.
-- Does not modify the live API5S reconciliation function.

CREATE OR REPLACE FUNCTION public.eduteach_booking_payment_ready(
  p_order_id uuid,
  p_transaction_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.orders%rowtype;
  v_course public.courses%rowtype;
  v_count integer;
  v_valid integer;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_found');
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.booking_slot_locks
  WHERE order_id = p_order_id;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_new_booking');
  END IF;

  SELECT *
  INTO v_course
  FROM public.courses
  WHERE id = v_order.course_id;

  IF NOT FOUND OR v_course.total_sessions NOT IN (10,20,30)
     OR v_count <> v_course.total_sessions THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_session_count');
  END IF;

  IF v_order.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'order_not_pending');
  END IF;

  IF p_transaction_at IS NULL
     OR v_order.expires_at IS NULL
     OR p_transaction_at > v_order.expires_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payment_after_deadline');
  END IF;

  IF v_order.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'hold_expired');
  END IF;

  SELECT count(*)
  INTO v_valid
  FROM public.booking_slot_locks
  WHERE order_id = p_order_id
    AND status = 'held'
    AND expires_at > now();

  IF v_valid <> v_count THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'booking_slots_unavailable');
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'ready');
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_booking_payment_ready(
  uuid, timestamptz
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_booking_payment_ready(
  uuid, timestamptz
) TO service_role;
