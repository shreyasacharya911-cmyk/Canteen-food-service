import fs from 'fs';
import path from 'path';

export interface MockData {
  allowed_emails: Array<{ email: string; role: string }>;
  profiles: Array<{ id: string; email: string; full_name: string; role: string; created_at: string }>;
  canteen_tables: Array<{ id: string; label: string; seats: number }>;
  menu_items: Array<{
    id: string;
    name: string;
    category: 'Meals' | 'Snacks' | 'Beverages' | 'Desserts';
    price_inr: number;
    prep_minutes: number;
    stock_remaining: number;
    is_available: boolean;
    emoji: string;
  }>;
  app_settings: Array<{
    id: number;
    open_time: string;
    close_time: string;
    slot_minutes: number;
    kitchen_capacity_per_slot: number;
    min_cancel_minutes: number;
    demo_clock_offset_minutes: number;
  }>;
  orders: Array<{
    id: string;
    user_id: string;
    table_id: string;
    slot_start: string;
    status: string;
    payment_status: string;
    total_inr: number;
    total_items: number;
    max_prep_minutes: number;
    start_by: string;
    cancel_cutoff: string;
    idempotency_key: string;
    cancelled_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  order_items: Array<{
    id: string;
    order_id: string;
    menu_item_id: string;
    name: string;
    unit_price_inr: number;
    prep_minutes: number;
    quantity: number;
  }>;
}

const DB_FILE = path.join(process.cwd(), '.canteen-mock-db.json');

const INITIAL_DATA: MockData = {
  allowed_emails: [
    { email: 'faculty.demo@mite.ac.in', role: 'faculty' },
    { email: 'staff.demo@mite.ac.in', role: 'staff' },
    { email: 'manager.demo@mite.ac.in', role: 'manager' },
  ],
  profiles: [
    {
      id: '11111111-1111-4111-a111-111111111111',
      email: 'student.demo@mite.ac.in',
      full_name: 'Student Demo',
      role: 'student',
      created_at: '2026-11-12T06:00:00.000Z',
    },
    {
      id: '22222222-2222-4222-a222-222222222222',
      email: 'student2.demo@mite.ac.in',
      full_name: 'Student 2 Demo',
      role: 'student',
      created_at: '2026-11-12T06:00:00.000Z',
    },
    {
      id: '33333333-3333-4333-a333-333333333333',
      email: 'faculty.demo@mite.ac.in',
      full_name: 'Faculty Demo',
      role: 'faculty',
      created_at: '2026-11-12T06:00:00.000Z',
    },
    {
      id: '44444444-4444-4444-a444-444444444444',
      email: 'staff.demo@mite.ac.in',
      full_name: 'Staff Demo',
      role: 'staff',
      created_at: '2026-11-12T06:00:00.000Z',
    },
    {
      id: '55555555-5555-4555-a555-555555555555',
      email: 'manager.demo@mite.ac.in',
      full_name: 'Manager Demo',
      role: 'manager',
      created_at: '2026-11-12T06:00:00.000Z',
    },
  ],
  canteen_tables: [
    { id: '10000000-0000-4000-a000-000000000001', label: 'T1', seats: 2 },
    { id: '10000000-0000-4000-a000-000000000002', label: 'T2', seats: 2 },
    { id: '10000000-0000-4000-a000-000000000003', label: 'T3', seats: 2 },
    { id: '10000000-0000-4000-a000-000000000004', label: 'T4', seats: 2 },
    { id: '10000000-0000-4000-a000-000000000005', label: 'T5', seats: 4 },
    { id: '10000000-0000-4000-a000-000000000006', label: 'T6', seats: 4 },
    { id: '10000000-0000-4000-a000-000000000007', label: 'T7', seats: 4 },
    { id: '10000000-0000-4000-a000-000000000008', label: 'T8', seats: 4 },
    { id: '10000000-0000-4000-a000-000000000009', label: 'T9', seats: 6 },
    { id: '10000000-0000-4000-a000-000000000010', label: 'T10', seats: 6 },
  ],
  menu_items: [
    {
      id: '20000000-0000-4000-a000-000000000001',
      name: 'South Indian Thali',
      category: 'Meals',
      price_inr: 90,
      prep_minutes: 12,
      stock_remaining: 30,
      is_available: true,
      emoji: '🍱',
    },
    {
      id: '20000000-0000-4000-a000-000000000002',
      name: 'Veg Biryani',
      category: 'Meals',
      price_inr: 110,
      prep_minutes: 15,
      stock_remaining: 30,
      is_available: true,
      emoji: '🍛',
    },
    {
      id: '20000000-0000-4000-a000-000000000003',
      name: 'Curd Rice',
      category: 'Meals',
      price_inr: 50,
      prep_minutes: 5,
      stock_remaining: 30,
      is_available: true,
      emoji: '🍚',
    },
    {
      id: '20000000-0000-4000-a000-000000000004',
      name: 'Chapati with Kurma',
      category: 'Meals',
      price_inr: 60,
      prep_minutes: 8,
      stock_remaining: 30,
      is_available: true,
      emoji: '🫓',
    },
    {
      id: '20000000-0000-4000-a000-000000000005',
      name: 'Masala Dosa',
      category: 'Snacks',
      price_inr: 60,
      prep_minutes: 10,
      stock_remaining: 30,
      is_available: true,
      emoji: '🥞',
    },
    {
      id: '20000000-0000-4000-a000-000000000006',
      name: 'Idli Vada Combo',
      category: 'Snacks',
      price_inr: 45,
      prep_minutes: 4,
      stock_remaining: 30,
      is_available: true,
      emoji: '🥟',
    },
    {
      id: '20000000-0000-4000-a000-000000000007',
      name: 'Samosa (2 pcs)',
      category: 'Snacks',
      price_inr: 30,
      prep_minutes: 3,
      stock_remaining: 30,
      is_available: true,
      emoji: '🥟',
    },
    {
      id: '20000000-0000-4000-a000-000000000008',
      name: 'Veg Puff',
      category: 'Snacks',
      price_inr: 25,
      prep_minutes: 3,
      stock_remaining: 30,
      is_available: true,
      emoji: '🥐',
    },
    {
      id: '20000000-0000-4000-a000-000000000009',
      name: 'Filter Coffee',
      category: 'Beverages',
      price_inr: 20,
      prep_minutes: 3,
      stock_remaining: 30,
      is_available: true,
      emoji: '☕',
    },
    {
      id: '20000000-0000-4000-a000-000000000010',
      name: 'Masala Tea',
      category: 'Beverages',
      price_inr: 15,
      prep_minutes: 3,
      stock_remaining: 30,
      is_available: true,
      emoji: '🍵',
    },
    {
      id: '20000000-0000-4000-a000-000000000011',
      name: 'Fresh Lime Soda',
      category: 'Beverages',
      price_inr: 30,
      prep_minutes: 4,
      stock_remaining: 30,
      is_available: true,
      emoji: '🍋',
    },
    {
      id: '20000000-0000-4000-a000-000000000012',
      name: 'Cold Badam Milk',
      category: 'Beverages',
      price_inr: 35,
      prep_minutes: 3,
      stock_remaining: 30,
      is_available: true,
      emoji: '🥛',
    },
    {
      id: '20000000-0000-4000-a000-000000000013',
      name: 'Gulab Jamun (2 pcs)',
      category: 'Desserts',
      price_inr: 40,
      prep_minutes: 3,
      stock_remaining: 30,
      is_available: true,
      emoji: '🍯',
    },
    {
      id: '20000000-0000-4000-a000-000000000014',
      name: 'Fruit Custard',
      category: 'Desserts',
      price_inr: 50,
      prep_minutes: 4,
      stock_remaining: 30,
      is_available: true,
      emoji: '🍨',
    },
  ],
  app_settings: [
    {
      id: 1,
      open_time: '09:00',
      close_time: '16:00',
      slot_minutes: 30,
      kitchen_capacity_per_slot: 20,
      min_cancel_minutes: 10,
      demo_clock_offset_minutes: 0,
    },
  ],
  orders: [],
  order_items: [],
};

// Global in-memory instance for hot-reloads
const globalForDb = globalThis as unknown as { __mockDb?: MockData };

export function getDb(): MockData {
  if (globalForDb.__mockDb) return globalForDb.__mockDb;
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      globalForDb.__mockDb = JSON.parse(content);
      return globalForDb.__mockDb!;
    }
  } catch {}
  globalForDb.__mockDb = JSON.parse(JSON.stringify(INITIAL_DATA));
  saveDb(globalForDb.__mockDb!);
  return globalForDb.__mockDb!;
}

export function saveDb(data: MockData): void {
  globalForDb.__mockDb = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

export function isMockMode(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return true;
  if (url.includes('placeholder') || url === 'mock') return true;
  return false;
}

