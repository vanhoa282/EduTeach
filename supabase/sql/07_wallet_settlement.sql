-- =============================================================================
-- EduTeach: Tự động hoàn tiền ví sau 7 ngày (pending → available)
-- DÁN TOÀN BỘ FILE NÀY VÀO Supabase Dashboard → SQL Editor → RUN.
-- An toàn khi chạy lại (IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
-- =============================================================================
-- Cơ chế kép:
--  1. App gọi RPC eduteach_settle_pending_balance khi mở màn hình Ví
--     (không phụ thuộc cron).
--  2. pg_cron chạy định kỳ mỗi giờ (nếu project đã bật pg_cron).
--
-- LƯU Ý (11/10/2026): quyết định sản phẩm là DUYỆT LIỀN — tiền vào
-- balance_available ngay khi HS xác nhận buổi, KHÔNG qua pending.
-- File này giữ lại làm cơ chế pending tuỳ chọn (ví dụ sau này giữ tiền
-- trong thời gian xử lý khiếu nại); hiện tại hàm là no-op vì pending luôn 0.
-- =============================================================================

-- Đánh dấu khoản thu nhập đã được chuyển sang số dư khả dụng
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

CREATE INDEX IF NOT EXISTS transactions_settle_idx
ON public.transactions(user_id, type, status, settled_at);

-- Chuyển balance_pending → balance_available cho khoản thu nhập
-- đã đủ 7 ngày. Trả về tổng số tiền đã chuyển.
CREATE OR REPLACE FUNCTION public.eduteach_settle_pending_balance(
  p_user_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row record;
  v_total integer;
  v_move integer;
  v_moved integer := 0;
BEGIN
  FOR v_row IN
    SELECT
      t.user_id,
      sum(t.amount)::integer AS total
    FROM public.transactions t
    WHERE t.type = 'session_earning'
      AND t.status = 'completed'
      AND t.settled_at IS NULL
      AND t.created_at <= now() - interval '7 days'
      AND (p_user_id IS NULL OR t.user_id = p_user_id)
    GROUP BY t.user_id
  LOOP
    -- Chỉ chuyển tối đa số dư đang chờ thực có.
    SELECT coalesce(balance_pending, 0) INTO v_move
    FROM public.wallets
    WHERE user_id = v_row.user_id
    FOR UPDATE;

    v_move := LEAST(coalesce(v_move, 0), v_row.total);

    IF v_move > 0 THEN
      UPDATE public.wallets
      SET balance_pending = coalesce(balance_pending, 0) - v_move,
          balance_available = coalesce(balance_available, 0) + v_move,
          updated_at = now()
      WHERE user_id = v_row.user_id;

      v_moved := v_moved + v_move;
    END IF;

    -- Đánh dấu settled để không tính lại lần sau.
    UPDATE public.transactions
    SET settled_at = now()
    WHERE type = 'session_earning'
      AND status = 'completed'
      AND settled_at IS NULL
      AND created_at <= now() - interval '7 days'
      AND user_id = v_row.user_id;
  END LOOP;

  RETURN v_moved;
END;
$$;

REVOKE ALL ON FUNCTION public.eduteach_settle_pending_balance(uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.eduteach_settle_pending_balance(uuid)
TO anon, authenticated;

-- =============================================================================
-- pg_cron: chạy mỗi giờ (chỉ hoạt động nếu đã bật pg_cron trong Supabase).
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'eduteach-settle-wallet-hourly',
      '0 * * * *',
      $fn$SELECT public.eduteach_settle_pending_balance();$fn$
    );
  ELSE
    RAISE NOTICE 'pg_cron chưa bật — bỏ qua lịch cron; app sẽ settle khi mở màn hình Ví.';
  END IF;
END;
$$;

SELECT 'EduTeach wallet settlement SQL applied' AS status;
