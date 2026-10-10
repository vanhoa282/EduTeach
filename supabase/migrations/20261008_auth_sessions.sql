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

CREATE OR REPLACE FUNCTION public.verify_eduteach_session(
  p_token_hash text
)
RETURNS TABLE (
  verified_user_id uuid,
  verified_role text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u.id, u.role::text
  FROM public.eduteach_auth_sessions s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.token_hash = p_token_hash
    AND s.revoked_at IS NULL
    AND s.expires_at > now()
    AND u.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_eduteach_session(text)
FROM PUBLIC, anon, authenticated;
