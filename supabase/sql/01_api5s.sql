-- EduTeach / API5S. Apply once in Supabase SQL Editor.
-- Auto settlement is OFF until explicitly configured and tested.
create table if not exists public.payment_gateway_config (
  id integer primary key default 1 check (id = 1),
  provider text not null default 'api5s.com' check (provider = 'api5s.com'),
  bank_code text not null default 'ACB' check (bank_code in ('ACB','MB','VCB','BIDV')),
  account_number text not null default '',
  account_holder text not null default '',
  api_token text,
  auto_enabled boolean not null default false,
  last_test_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text,
  updated_at timestamptz not null default now()
);
insert into public.payment_gateway_config(id) values (1) on conflict(id) do nothing;

create table if not exists public.payment_admin_auth_attempts (
  phone text primary key,
  failures integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.payment_admin_auth_attempts enable row level security;
revoke all on public.payment_admin_auth_attempts from public, anon, authenticated;
grant all on public.payment_admin_auth_attempts to service_role;

create table if not exists public.bank_payment_matches (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'api5s.com',
  bank_code text not null,
  account_number text not null,
  provider_tx_id text not null,
  transaction_at timestamptz not null,
  amount bigint not null check (amount > 0),
  order_id uuid not null unique references public.orders(id),
  matched_at timestamptz not null default now(),
  unique (provider, bank_code, account_number, provider_tx_id)
);

-- All sensitive tables: no anonymous/direct mobile access.
alter table public.payment_gateway_config enable row level security;
alter table public.bank_payment_matches enable row level security;
revoke all on public.payment_gateway_config from public, anon, authenticated;
revoke all on public.bank_payment_matches from public, anon, authenticated;
grant all on public.payment_gateway_config to service_role;
grant all on public.bank_payment_matches to service_role;

-- Expose ONLY bank/payment destination to React Native, never API token.
create or replace function public.get_public_payment_bank()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'provider', provider,
    'bank_code', bank_code,
    'account_number', account_number,
    'account_holder', account_holder,
    'ready', (length(account_number) > 0 and length(account_holder) > 0)
  )
  from public.payment_gateway_config where id = 1;
$$;
revoke all on function public.get_public_payment_bank() from public;
grant execute on function public.get_public_payment_bank() to anon, authenticated, service_role;

-- Process one confirmed IN transaction, atomically; only Edge Function service-role may call.
-- Only full-price, full-paid orders auto-settle; partial payments stay manual.
create or replace function public.reconcile_api5s_payment(
  p_bank text,
  p_account text,
  p_transaction_id text,
  p_amount bigint,
  p_description text,
  p_transaction_at timestamptz
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cfg public.payment_gateway_config%rowtype;
  v_order public.orders%rowtype;
  v_course public.courses%rowtype;
  v_codes text[];
  v_code text;
  v_match uuid;
  v_session_index integer;
  v_start timestamptz;
  v_list_price numeric;
  v_expected_total numeric;
  v_discount numeric;
begin
  if p_amount is null or p_amount <= 0 or p_transaction_at is null or
     nullif(trim(coalesce(p_transaction_id,'')), '') is null or
     length(coalesce(p_transaction_id,'')) > 160 then
    return jsonb_build_object('status','invalid');
  end if;

  select * into v_cfg from public.payment_gateway_config where id = 1;
  if not found or not v_cfg.auto_enabled or v_cfg.bank_code <> p_bank or v_cfg.account_number <> p_account then
    return jsonb_build_object('status','disabled');
  end if;

  -- Word boundaries prevent EDT1234567 from matching EDT123456.
  select array_agg(distinct (m.captures)[2]) into v_codes
  from regexp_matches(upper(coalesce(p_description,'')), '(^|[^A-Z0-9])(EDT[0-9]{6})([^A-Z0-9]|$)', 'g') as m(captures);
  if coalesce(array_length(v_codes, 1), 0) <> 1 then
    return jsonb_build_object('status','missing_or_ambiguous_code');
  end if;
  v_code := v_codes[1];

  select * into v_order from public.orders where order_code = v_code for update;
  if not found then
    return jsonb_build_object('status','unknown_order');
  end if;
  if v_order.status <> 'pending' then
    return jsonb_build_object('status','order_not_pending');
  end if;

  select * into v_course from public.courses where id = v_order.course_id for update;
  if not found or v_course.status <> 'pending_payment' then
    return jsonb_build_object('status','course_not_pending');
  end if;
  if v_course.payment_type <> 'full' or v_order.amount <> v_course.total_price or
     p_amount <> v_order.amount then
    return jsonb_build_object('status','amount_or_installment_mismatch');
  end if;

  -- Never trust totals calculated by the mobile client.
  select tp.price_per_session into v_list_price
    from public.tutor_profiles tp where tp.user_id = v_course.tutor_id;
  if v_list_price is null or v_list_price <= 0 or
     v_course.total_sessions not in (10,20,30) or
     v_course.price_per_session <> v_list_price then
    return jsonb_build_object('status','unverified_course_price');
  end if;
  v_discount := case v_course.total_sessions when 10 then 0 when 20 then 5 when 30 then 10 else 100 end;
  v_expected_total := v_list_price * v_course.total_sessions -
                      round(v_list_price * v_course.total_sessions * v_discount / 100);
  if v_expected_total <> v_course.total_price then
    return jsonb_build_object('status','unverified_course_total');
  end if;

  -- Reject historical payments; allow 15 min delayed bank posting after order deadline.
  if p_transaction_at < v_order.created_at - interval '5 minutes' or
     p_transaction_at > coalesce(v_order.expires_at, v_order.created_at + interval '30 minutes') + interval '15 minutes' then
    return jsonb_build_object('status','outside_payment_window');
  end if;

  -- Unique constraints stop same bank transaction paying two orders.
  insert into public.bank_payment_matches(
    provider, bank_code, account_number, provider_tx_id, transaction_at, amount, order_id
  ) values ('api5s.com', p_bank, p_account, trim(p_transaction_id), p_transaction_at, p_amount, v_order.id)
  on conflict do nothing returning id into v_match;
  if v_match is null then
    return jsonb_build_object('status','duplicate_transaction');
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = v_order.id;
  update public.courses set status = 'active', paid_amount = v_order.amount where id = v_course.id;

  -- Never delete/recreate existing sessions. Insert missing sessions only.
  for v_session_index in 1..v_course.total_sessions loop
    v_start := (
      date_trunc('day', timezone('Asia/Ho_Chi_Minh', now()))
      + (v_session_index * interval '3 days') + interval '18 hours'
    ) at time zone 'Asia/Ho_Chi_Minh';
    insert into public.sessions(
      course_id, session_number, scheduled_at, scheduled_start, scheduled_end, status
    )
    select v_course.id, v_session_index, v_start, v_start, v_start + interval '2 hours', 'pending'
    where not exists (
      select 1 from public.sessions s
      where s.course_id = v_course.id and s.session_number = v_session_index
    );
  end loop;

  insert into public.notifications(user_id,title,body,type,ref_id)
  values
    (v_course.student_id, '✅ Khóa học đã được kích hoạt', 'Thanh toán đơn ' || v_order.order_code || ' đã được xác nhận.', 'course', v_course.id),
    (v_course.tutor_id, '📚 Bạn có khóa học mới', 'Khóa ' || v_course.subject || ' đã được thanh toán.', 'course', v_course.id);

  return jsonb_build_object('status','paid','order_id',v_order.id,'order_code',v_order.order_code);
end;
$$;
revoke all on function public.reconcile_api5s_payment(text,text,text,bigint,text,timestamptz) from public, anon, authenticated;
grant execute on function public.reconcile_api5s_payment(text,text,text,bigint,text,timestamptz) to service_role;

-- CRITICAL: Existing client-side order creation and wallet payouts must be audited before enabling live money.

-- Existing checkout creates order before bill upload. Bill must be optional.
alter table public.orders alter column bill_url drop not null;
-- Stop random EDT code re-use across orders. Fix old duplicates before applying if any.
create unique index if not exists eduteach_unique_order_code on public.orders(order_code);
