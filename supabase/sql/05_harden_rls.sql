-- =============================================================================
-- EduTeach: Khoá RLS sau cutover — chặn client tự INSERT/DELETE courses + orders
-- DÁN TOÀN BỘ FILE NÀY VÀO Supabase Dashboard → SQL Editor → RUN.
-- Project ref: jrkqfalwcleetppqtcvb
-- An toàn khi chạy lại (DROP POLICY IF EXISTS).
-- =============================================================================
-- BỐI CẢNH:
-- - App demo dùng anon key (chưa dùng Supabase Auth nên không phân biệt được
--   role qua JWT). Luồng đặt đơn hợp lệ đi qua Edge Function booking-create
--   (service role, BYPASS RLS) → chặn INSERT từ client KHÔNG ảnh hưởng luồng đúng.
-- - Admin hiện duyệt đơn bằng cách UPDATE orders/courses trực tiếp từ client,
--   nên CHƯA khoá UPDATE. Production: chuyển admin approve qua Edge Function
--   rồi chạy thêm phần khoá UPDATE ở cuối file.
-- =============================================================================

-- ── 1) courses: chặn INSERT + DELETE từ client ────────────────────────────────
DROP POLICY IF EXISTS "block_client_insert_courses" ON public.courses;
CREATE POLICY "block_client_insert_courses"
ON public.courses
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "block_client_delete_courses" ON public.courses;
CREATE POLICY "block_client_delete_courses"
ON public.courses
FOR DELETE
TO anon, authenticated
USING (false);

-- ── 2) orders: chặn INSERT + DELETE từ client ─────────────────────────────────
DROP POLICY IF EXISTS "block_client_insert_orders" ON public.orders;
CREATE POLICY "block_client_insert_orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "block_client_delete_orders" ON public.orders;
CREATE POLICY "block_client_delete_orders"
ON public.orders
FOR DELETE
TO anon, authenticated
USING (false);

-- ── 3) Cột firebase_uid cho tương lai (Firebase Auth mapping) ─────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS firebase_uid text;

CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_unique_idx
ON public.users(firebase_uid)
WHERE firebase_uid IS NOT NULL;

-- ── 4) (Production, CHỈ chạy sau khi chuyển admin approve qua Edge Function) ──
-- BỎ COMMENT 2 khối dưới khi đã sẵn sàng:

-- DROP POLICY IF EXISTS "block_client_update_courses" ON public.courses;
-- CREATE POLICY "block_client_update_courses"
-- ON public.courses
-- FOR UPDATE
-- TO anon, authenticated
-- USING (false);

-- DROP POLICY IF EXISTS "block_client_update_orders" ON public.orders;
-- CREATE POLICY "block_client_update_orders"
-- ON public.orders
-- FOR UPDATE
-- TO anon, authenticated
-- USING (false);

-- =============================================================================
-- KIỂM TRA NHANH sau khi chạy (chạy bằng SQL Editor):
--   SELECT policyname, cmd FROM pg_policies
--   WHERE tablename IN ('courses','orders') ORDER BY tablename, cmd;
-- =============================================================================

SELECT 'EduTeach RLS hardening SQL applied' AS status;
