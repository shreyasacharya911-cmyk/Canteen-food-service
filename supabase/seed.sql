-- CanteenNow Seed Data (idempotent)
-- Run in Supabase SQL Editor after supabase/schema.sql

insert into app_settings default values on conflict (id) do nothing;

-- 10 tables: T1-T4 (2 seats), T5-T8 (4 seats), T9-T10 (6 seats)
insert into canteen_tables (label, seats) values
  ('T1', 2),
  ('T2', 2),
  ('T3', 2),
  ('T4', 2),
  ('T5', 4),
  ('T6', 4),
  ('T7', 4),
  ('T8', 4),
  ('T9', 6),
  ('T10', 6)
on conflict (label) do nothing;

-- 14 menu items across 4 categories (stock 30 each, prep 3-15 min, >= 2 items >= 10 min)
insert into menu_items (name, category, price_inr, prep_minutes, stock_remaining, is_available, emoji) values
  ('South Indian Thali', 'Meals', 90, 12, 30, true, '🍱'),
  ('Veg Biryani', 'Meals', 110, 15, 30, true, '🍛'),
  ('Curd Rice', 'Meals', 50, 5, 30, true, '🍚'),
  ('Chapati with Kurma', 'Meals', 60, 8, 30, true, '🫓'),
  ('Masala Dosa', 'Snacks', 60, 10, 30, true, '🥞'),
  ('Idli Vada Combo', 'Snacks', 45, 4, 30, true, '🥟'),
  ('Samosa (2 pcs)', 'Snacks', 30, 3, 30, true, '🥟'),
  ('Veg Puff', 'Snacks', 25, 3, 30, true, '🥐'),
  ('Filter Coffee', 'Beverages', 20, 3, 30, true, '☕'),
  ('Masala Tea', 'Beverages', 15, 3, 30, true, '🍵'),
  ('Fresh Lime Soda', 'Beverages', 30, 4, 30, true, '🍋'),
  ('Cold Badam Milk', 'Beverages', 35, 3, 30, true, '🥛'),
  ('Gulab Jamun (2 pcs)', 'Desserts', 40, 3, 30, true, '🍯'),
  ('Fruit Custard', 'Desserts', 50, 4, 30, true, '🍨')
on conflict (name) do nothing;

-- Allowlisted demo accounts (students default via COLLEGE_EMAIL_DOMAIN)
insert into allowed_emails (email, role) values
  ('faculty.demo@mite.ac.in', 'faculty'),
  ('staff.demo@mite.ac.in', 'staff'),
  ('manager.demo@mite.ac.in', 'manager')
on conflict (email) do nothing;
