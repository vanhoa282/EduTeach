-- Theo dõi đăng nhập sai theo tài khoản.
-- Chỉ backend có quyền service_role được đọc/ghi.

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

-- Ghi nhận thất bại trong một thao tác nguyên tử.
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
