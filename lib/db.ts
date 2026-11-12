import type { MenuItem, OrderStatus, PaymentStatus, Role } from './types';

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

export interface MenuItemRow {
  id: string;
  name: string;
  category: MenuItem['category'];
  price_inr: number;
  prep_minutes: number;
  stock_remaining: number;
  is_available: boolean;
  emoji: string;
}

export interface TableRow {
  id: string;
  label: string;
  seats: number;
}

export interface OrderRow {
  id: string;
  user_id: string;
  table_id: string;
  slot_start: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_inr: number;
  total_items: number;
  max_prep_minutes: number;
  start_by: string;
  cancel_cutoff: string;
  idempotency_key: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  unit_price_inr: number;
  prep_minutes: number;
  quantity: number;
}

export interface SettingsRow {
  id: number;
  open_time: string;
  close_time: string;
  slot_minutes: number;
  kitchen_capacity_per_slot: number;
  min_cancel_minutes: number;
  demo_clock_offset_minutes: number;
}

export const ACTIVE_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'completed'];
export const QUEUE_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready'];

export function mapMenuItem(r: MenuItemRow): MenuItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    priceInr: r.price_inr,
    prepMinutes: r.prep_minutes,
    stockRemaining: r.stock_remaining,
    isAvailable: r.is_available,
    emoji: r.emoji,
  };
}

