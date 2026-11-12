-- CanteenNow Database Schema
-- Run in Supabase SQL Editor before supabase/seed.sql

create extension if not exists pgcrypto;

create type user_role as enum ('student', 'faculty', 'staff', 'manager');
create type order_status as enum (
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled_free',
  'cancelled_late',
  'no_show'
);
create type payment_status as enum ('paid', 'refunded', 'forfeited');

create table allowed_emails (
  email text primary key, -- always lowercase
  role user_role not null
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role not null,
  created_at timestamptz not null default now()
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- AM-7: unique constraint for idempotent seeding
  category text not null check (category in ('Meals', 'Snacks', 'Beverages', 'Desserts')),
  price_inr integer not null check (price_inr > 0),
  prep_minutes integer not null check (prep_minutes between 1 and 30),
  stock_remaining integer not null default 30 check (stock_remaining >= 0),
  is_available boolean not null default true,
  emoji text not null default ''
);

create table canteen_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null unique, -- T1..T10
  seats integer not null check (seats in (2, 4, 6))
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  table_id uuid not null references canteen_tables(id),
  slot_start timestamptz not null,
  status order_status not null default 'confirmed',
  payment_status payment_status not null default 'paid',
  total_inr integer not null check (total_inr > 0),
  total_items integer not null check (total_items > 0),
  max_prep_minutes integer not null,
  start_by timestamptz not null, -- slot_start - max_prep_minutes
  cancel_cutoff timestamptz not null, -- slot_start - greatest(min_cancel_minutes, max_prep_minutes)
  idempotency_key uuid not null unique,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A table holds one active order per slot. Cancelled and no-show orders release it.
create unique index uq_active_table_slot on orders (table_id, slot_start)
  where status in ('confirmed', 'preparing', 'ready', 'completed');

-- D10: one active order per user per slot.
create unique index uq_active_user_slot on orders (user_id, slot_start)
  where status in ('confirmed', 'preparing', 'ready', 'completed');

create index idx_orders_slot on orders (slot_start);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  name text not null, -- snapshot at order time
  unit_price_inr integer not null,
  prep_minutes integer not null,
  quantity integer not null check (quantity between 1 and 5)
);

create table app_settings (
  id integer primary key default 1 check (id = 1),
  open_time time not null default '09:00',
  close_time time not null default '16:00',
  slot_minutes integer not null default 30,
  kitchen_capacity_per_slot integer not null default 20,
  min_cancel_minutes integer not null default 10,
  demo_clock_offset_minutes integer not null default 0
);

insert into app_settings default values on conflict (id) do nothing;

-- Enable RLS on every table with no public policies (server service-role only)
alter table allowed_emails enable row level security;
alter table profiles enable row level security;
alter table menu_items enable row level security;
alter table canteen_tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table app_settings enable row level security;

-- Atomic order placement function
create or replace function place_order(
  p_user_id uuid,
  p_table_id uuid,
  p_slot_start timestamptz,
  p_items jsonb,
  p_idempotency_key uuid,
  p_now timestamptz
) returns uuid
language plpgsql
security definer
as $$
declare
  v_existing_id uuid;
  v_settings record;
  v_ist_slot timestamp;
  v_ist_now timestamp;
  v_slot_time time;
  v_slot_minutes integer;
  v_item record;
  v_menu record;
  v_total_items integer := 0;
  v_total_inr integer := 0;
  v_max_prep integer := 0;
  v_start_by timestamptz;
  v_cancel_cutoff timestamptz;
  v_used_capacity integer := 0;
  v_order_id uuid;
  v_constraint text;
begin
  -- 1. Idempotency check
  select id into v_existing_id from orders where idempotency_key = p_idempotency_key;
  if v_existing_id is not null then
    return v_existing_id;
  end if;

  -- 2. Lock slot
  perform pg_advisory_xact_lock(hashtext('slot:' || p_slot_start::text));

  -- 3. Load settings and validate slot boundary, open hours, and same IST date
  select * into v_settings from app_settings where id = 1;
  if not found then
    raise exception using message = 'INTERNAL';
  end if;

  v_ist_slot := p_slot_start at time zone 'Asia/Kolkata';
  v_ist_now := p_now at time zone 'Asia/Kolkata';

  if v_ist_slot::date <> v_ist_now::date then
    raise exception using message = 'INVALID_SLOT';
  end if;

  v_slot_time := v_ist_slot::time;
  if extract(second from v_slot_time) <> 0
     or (extract(hour from v_slot_time)::integer * 60 + extract(minute from v_slot_time)::integer) % v_settings.slot_minutes <> 0
     or v_slot_time < v_settings.open_time
     or (v_slot_time + make_interval(mins => v_settings.slot_minutes)) > v_settings.close_time then
    raise exception using message = 'INVALID_SLOT';
  end if;

  -- Verify table exists
  perform 1 from canteen_tables where id = p_table_id;
  if not found then
    raise exception using message = 'VALIDATION_ERROR';
  end if;

  -- 4. Lock and validate items in deterministic order
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using message = 'VALIDATION_ERROR';
  end if;

  for v_item in
    select
      (elem->>'menuItemId')::uuid as menu_item_id,
      sum((elem->>'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) as elem
    group by (elem->>'menuItemId')::uuid
    order by (elem->>'menuItemId')::uuid
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 5 then
      raise exception using message = 'VALIDATION_ERROR';
    end if;

    select * into v_menu from menu_items where id = v_item.menu_item_id for update;
    if not found or not v_menu.is_available or v_menu.stock_remaining < v_item.quantity then
      raise exception using message = 'ITEM_UNAVAILABLE';
    end if;

    v_total_items := v_total_items + v_item.quantity;
    v_total_inr := v_total_inr + (v_menu.price_inr * v_item.quantity);
    if v_menu.prep_minutes > v_max_prep then
      v_max_prep := v_menu.prep_minutes;
    end if;
  end loop;

  if v_total_items > 10 then
    raise exception using message = 'VALIDATION_ERROR';
  end if;

  -- 5 & 6. Timing check
  v_start_by := p_slot_start - make_interval(mins => v_max_prep);
  if p_now >= v_start_by then
    raise exception using message = 'SLOT_TOO_SOON';
  end if;

  -- 7. Cancel cutoff
  v_cancel_cutoff := p_slot_start - make_interval(mins => greatest(v_settings.min_cancel_minutes, v_max_prep));

  -- 8. Kitchen capacity check
  select coalesce(sum(total_items), 0)
    into v_used_capacity
    from orders
    where slot_start = p_slot_start
      and status in ('confirmed', 'preparing', 'ready', 'completed');

  if v_used_capacity + v_total_items > v_settings.kitchen_capacity_per_slot then
    raise exception using message = 'KITCHEN_FULL';
  end if;

  -- 9. Insert order and handle partial unique violations
  begin
    insert into orders (
      user_id,
      table_id,
      slot_start,
      status,
      payment_status,
      total_inr,
      total_items,
      max_prep_minutes,
      start_by,
      cancel_cutoff,
      idempotency_key,
      created_at,
      updated_at
    ) values (
      p_user_id,
      p_table_id,
      p_slot_start,
      'confirmed',
      'paid',
      v_total_inr,
      v_total_items,
      v_max_prep,
      v_start_by,
      v_cancel_cutoff,
      p_idempotency_key,
      p_now,
      p_now
    ) returning id into v_order_id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'uq_active_table_slot' then
        raise exception using message = 'TABLE_TAKEN';
      elsif v_constraint = 'uq_active_user_slot' then
        raise exception using message = 'ALREADY_BOOKED_SLOT';
      elsif v_constraint like '%idempotency%' then
        select id into v_existing_id from orders where idempotency_key = p_idempotency_key;
        return v_existing_id;
      else
        raise;
      end if;
  end;

  -- 10. Insert order items and decrement stock
  for v_item in
    select
      (elem->>'menuItemId')::uuid as menu_item_id,
      sum((elem->>'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) as elem
    group by (elem->>'menuItemId')::uuid
    order by (elem->>'menuItemId')::uuid
  loop
    select * into v_menu from menu_items where id = v_item.menu_item_id;

    insert into order_items (
      order_id,
      menu_item_id,
      name,
      unit_price_inr,
      prep_minutes,
      quantity
    ) values (
      v_order_id,
      v_menu.id,
      v_menu.name,
      v_menu.price_inr,
      v_menu.prep_minutes,
      v_item.quantity
    );

    update menu_items
       set stock_remaining = stock_remaining - v_item.quantity
     where id = v_menu.id;
  end loop;

  return v_order_id;
end;
$$;

-- Atomic order cancellation function
create or replace function cancel_order(
  p_order_id uuid,
  p_user_id uuid,
  p_now timestamptz
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_order record;
  v_item record;
  v_new_status order_status;
  v_new_payment payment_status;
  v_refund integer := 0;
begin
  -- 1. Lock order row
  select * into v_order from orders where id = p_order_id and user_id = p_user_id for update;
  if not found then
    raise exception using message = 'NOT_FOUND';
  end if;

  -- 2. Validate state and time
  if v_order.status <> 'confirmed' or p_now >= v_order.slot_start then
    raise exception using message = 'CANNOT_CANCEL';
  end if;

  -- 3. Cutoff comparison
  if p_now <= v_order.cancel_cutoff then
    v_new_status := 'cancelled_free';
    v_new_payment := 'refunded';
    v_refund := v_order.total_inr;
  else
    v_new_status := 'cancelled_late';
    v_new_payment := 'forfeited';
    v_refund := 0;
  end if;

  -- 4. Restore stock
  for v_item in select menu_item_id, quantity from order_items where order_id = v_order.id loop
    update menu_items
       set stock_remaining = stock_remaining + v_item.quantity
     where id = v_item.menu_item_id;
  end loop;

  -- 5. Update order
  update orders
     set status = v_new_status,
         payment_status = v_new_payment,
         cancelled_at = p_now,
         updated_at = p_now
   where id = v_order.id;

  return jsonb_build_object(
    'status', v_new_status,
    'payment_status', v_new_payment,
    'refundInr', v_refund
  );
end;
$$;
