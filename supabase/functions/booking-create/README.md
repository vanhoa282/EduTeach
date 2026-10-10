# EduTeach - Booking Create

Status: NOT DEPLOYED.

Planned trusted backend:
- Authenticate the actual student server-side.
- Validate tutor availability and session dates.
- Recalculate price on the server.
- Create course, order and booking locks atomically.
- Reject overlapping lessons.
- Hold all sessions for 30 minutes.
- Confirm payment only from verified bank reconciliation.
- Release expired/cancelled holds safely.

SECURITY:
Do not expose SUPABASE_SERVICE_ROLE_KEY in the app.
Do not trust student_id, amount or paid status from client.
Do not expose an unauthenticated SECURITY DEFINER booking RPC.

Existing payment-api5s and push-webhook are unchanged.
