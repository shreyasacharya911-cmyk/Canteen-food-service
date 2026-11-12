# CanteenNow: Product and Technical Specification

*v1.0 draft for approval · 6-hour hackathon · 2 developers, each using Google Antigravity*

**How to read this document.** Every rule is meant literally. Where two readings were possible, this spec picks one. IDs (D4, FR-7, F7, AC-7.2) are shared vocabulary for both developers. Anything not written here is out of scope.

## 0. Locked decisions and assumptions

You approved the cancellation rule, fixed 30-minute slots, table bound to the order, and the laptop webcam. Items marked ASSUMED are my additions to close gaps; please correct any of them.

| ID | Decision | Status |
| --- | --- | --- |
| D1 | Working product name: CanteenNow | ASSUMED |
| D2 | Slots are fixed 30-minute blocks, today only, 09:00 to 16:00 (last slot starts 15:30), timezone Asia/Kolkata | Slots approved; hours ASSUMED |
| D3 | One order = food + one table for one slot. A table is mandatory in P0 | Approved |
| D4 | Free cancellation until `slot_start - max(10 min, longest prep time in the order)` | Approved (corrected) |
| D5 | Cancelling after the cutoff but before staff mark Preparing is allowed with no refund. Cancelling once Preparing, or after slot start, is not allowed | ASSUMED detail |
| D6 | Payment is mocked. No gateway, no real money | Approved |
| D7 | Camera: laptop webcam in the browser, Manager page only, nothing recorded or uploaded | Approved |
| D8 | 10 tables: four 2-seaters (T1-T4), four 4-seaters (T5-T8), two 6-seaters (T9-T10) | ASSUMED |
| D9 | Kitchen capacity: 20 items per slot (sum of quantities across active orders) | ASSUMED |
| D10 | A user may hold at most one active order per slot | ASSUMED |
| D11 | Students and faculty have identical features. Role differs only by label | ASSUMED |
| D12 | Currency is INR, stored as whole-rupee integers | ASSUMED |
| D13 | No websockets. The UI polls every 5 to 10 seconds | Approved |
| D14 | An order can be placed only if `now < slot_start - max prep time` (the kitchen's 'start by' time is still in the future) | ASSUMED |

## 1. Product specification

### 1.1 Product objective

Let a college canteen customer reserve food and a seat for the same 30-minute slot in under two minutes, so that on arrival the food is ready and the table is held. Give staff a predictable workload and give the Manager live visibility.

**Demo success test:** in under five minutes a judge sees one full cycle: a student orders, staff cook, one order is cancelled early (refund) and another late (no refund), and the Manager sees everything including the camera.

### 1.2 Target users

| User | Role value | Goal | Device |
| --- | --- | --- | --- |
| Student | `student` | Skip the queue, be sure of food and a seat in a short break | Phone browser |
| Faculty | `faculty` | Same as student | Phone or laptop |
| Canteen staff | `staff` | See what to cook and when, mark progress, mark items sold out | Tablet or counter laptop |
| Manager (admin) | `manager` | See orders, table use, and the canteen floor live | Laptop with the webcam |

### 1.3 Main user problems

1. Queues eat into a short break.
2. Customers cannot tell whether an item is available or how long it takes.
3. There is no guarantee of a seat.
4. The kitchen gets unpredictable rushes.
5. The Manager has no live view of demand or the canteen floor.

### 1.4 Core value proposition

**Arrive, sit, eat: food timed to be ready at your slot, with a table held for you.**

What the design emphasises (without claiming uniqueness, since no competitor search was done):

- **Single booking** for food and seat.
- **Arrival-synchronised cooking:** each order carries a `start_by` time (slot start minus longest prep time) that drives the staff queue.
- **Capacity-aware slots:** a slot shows Full when tables or kitchen capacity run out.

### 1.5 Complete user journey

**Customer**

1. Opens the site, logs in with Google using the college email (or demo login), lands on `/menu`.
2. Browses the menu. Sold-out items are greyed out. Adds items to the cart.
3. Opens checkout, picks a slot (unavailable slots show a reason), then picks a table.
4. Reviews the order: total, ready-by time, and a line such as 'Free cancellation until 12:35 PM'.
5. Taps Pay (mock). The order is confirmed.
6. Watches status on the order page (updates every 5 s).
7. Optionally cancels. A dialog states whether a refund applies before the user confirms.
8. Arrives, collects ready food, sits at the booked table. Staff mark the order Completed.

**Staff**

1. Logs in, lands on `/staff`. The queue is sorted by `start_by`.
2. Taps Start preparing, then Mark ready, then Complete.
3. On the Menu tab, toggles sold-out for any item.

**Manager**

1. Logs in, lands on `/manager`.
2. Views KPIs, the orders table, the table-occupancy grid for the current slot, and the camera panel (Start camera).

### 1.6 Functional requirements

- **FR-1** Login is allowed only for emails on `COLLEGE_EMAIL_DOMAIN` or in the `allowed_emails` table. Enforced on the server.
- **FR-2** Roles are `student`, `faculty`, `staff`, `manager`. Staff and manager can only come from `allowed_emails`.
- **FR-3** The menu shows name, price, category, prep minutes, and availability. An item is purchasable only if `is_available = true` and `stock_remaining > 0`.
- **FR-4** The slot list for today shows each slot's state: `bookable`, `full_tables`, `full_kitchen`, `too_soon`, or `passed`.
- **FR-5** The table list for a slot shows each table as free or taken, with seat count.
- **FR-6** Order placement is atomic: it validates stock, kitchen capacity, table availability, and timing, then stores the order as paid, or fails with nothing stored.
- **FR-7** Cancellation follows D4 and D5 and sets the correct payment outcome.
- **FR-8** Order status moves only forward: `confirmed → preparing → ready → completed`, or to a cancelled state from `confirmed` only.
- **FR-9** Staff see a queue and change status. Staff can toggle item availability.
- **FR-10** The Manager sees KPIs, all of today's orders, and table occupancy.
- **FR-11** The Manager can show a live laptop-webcam preview. No recording or upload.
- **FR-12** Every route and API enforces role access on the server. Client-side hiding is only a convenience.

### 1.7 Non-functional requirements

| Area | Requirement |
| --- | --- |
| Correctness | No double-booked table and no negative stock, enforced in the database, not only in app code |
| Performance | Pages usable within 2 s on campus Wi-Fi. API responses under 500 ms for about 50 simultaneous users (demo scale) |
| Security | Service-role key only on the server. RLS enabled on all tables with no public policies. No secrets in client code. Role checked on every API call |
| Usability | Mobile-first from 360 px. Touch targets at least 44 px (staff screen 48 px). One primary action per screen |
| Reliability | Local run (`localhost`) works as a full fallback if deployment or Wi-Fi fails |
| Privacy | Camera preview stays in the Manager's browser. No frames are sent to any server |
| Time | All server logic uses UTC timestamps. Display and slot generation use Asia/Kolkata. One helper `getNow()` supplies the current time |
| Accessibility | Labels on inputs, visible focus states, status never conveyed by colour alone (always with text) |

## 2. Feature prioritisation

| Priority | Features |
| --- | --- |
| **P0** | F1 Login and roles · F2 Menu, availability, prep time · F3 Slot picker with capacity · F4 Table picker · F5 Atomic order placement · F6 Mock payment · F7 Cancellation with cutoff and refund result · F8 My orders · F9 Staff queue and sold-out toggle · F10 Manager dashboard · F11 Manager camera panel · F12 Seed data and demo accounts |
| **P1** | Demo clock control (Manager can shift 'now' by minutes, to demonstrate the cutoff) · No-show marking by staff · QR table check-in · Sample-video fallback for the camera panel · Staff stock-quantity editing · Sound alert for new staff orders · Takeaway order without a table · Load-adjusted prep estimate |
| **P2** | Crowd counting on the webcam (browser ML) · Notifications (push, WhatsApp, email) · No-show strikes · Analytics charts · Real payment gateway · Future-day booking · Faculty-specific features · PWA install · Multiple canteens |

### P0 behaviour and acceptance criteria

**F1 Login and roles**

- *Behaviour:* `/login` shows 'Continue with Google' and a 'Demo login' email and password form (shown only when `NEXT_PUBLIC_DEMO_LOGIN=true`). After sign-in the app calls `POST /api/auth/bootstrap`. If the email is in `allowed_emails`, the role comes from that row. Otherwise, if the domain equals `COLLEGE_EMAIL_DOMAIN`, the role is `student`. Otherwise the user is signed out and told to use a college email. Redirects: customer to `/menu`, staff to `/staff`, manager to `/manager`.
- AC-1.1 A non-college Gmail account is rejected with a message and ends with no session.
- AC-1.2 An allowlisted manager demo account lands on `/manager`.
- AC-1.3 A student opening `/staff` or `/manager` is redirected to `/menu`. A student calling `/api/staff/*` or `/api/manager/*` gets 403.
- AC-1.4 Any `/api/*` call without a session returns 401, except `/api/health`.

**F2 Menu, availability, prep time**

- *Behaviour:* `/menu` lists items under category tabs. Each card shows name, price, prep time ('10 min'), and a badge: Available, 'Only N left' when `stock_remaining <= 5`, or Sold out. Quantity limits: 5 per item and 10 items per order.
- AC-2.1 Sold-out items cannot be added.
- AC-2.2 A change made by staff appears on the customer menu within 10 s.
- AC-2.3 The cart survives navigation between pages in the same tab.

**F3 Slot picker with capacity**

- *Behaviour:* Checkout calls `GET /api/customer/slots?maxPrep=<min>&qty=<n>`. Each slot shows its time, free tables, and kitchen items remaining. A slot is `too_soon` if `slot_start - maxPrep <= now` (D14), and `passed` if `slot_start <= now`.
- AC-3.1 A slot with zero free tables shows 'Full'.
- AC-3.2 A slot whose remaining kitchen capacity is below the cart quantity shows 'Kitchen full'.
- AC-3.3 Disabled slots show their reason in text.

**F4 Table picker**

- *Behaviour:* After a slot is chosen, a grid shows T1 to T10 with seats and a free or taken state. The user picks one free table.
- AC-4.1 Taken tables are not selectable.
- AC-4.2 If two users choose the same table, the second gets `TABLE_TAKEN` (409) and the grid refreshes with a toast.

**F5 Atomic order placement**

- *Behaviour:* `POST /api/customer/orders` calls one SQL function, `place_order`, which locks the slot, checks everything, decrements stock, inserts the order and its items, and returns the order.
- AC-5.1 With 20 parallel requests for the last unit of an item, exactly one succeeds and stock never goes below 0.
- AC-5.2 Two requests for the same table and slot: exactly one succeeds. The database's partial unique index backs this.
- AC-5.3 On any failure nothing is stored (no partial order, no stock change).
- AC-5.4 The success response includes `status`, `start_by`, and `cancel_cutoff`.

**F6 Mock payment**

- *Behaviour:* The review step shows 'Pay ₹X' and the note 'Test payment: no money is charged'. A modal shows a 1.5 s spinner, then success. The client generates one `idempotency_key` (UUID) per checkout attempt. Payment status is set to `paid` inside `place_order`. There is no pending-payment state.
- AC-6.1 The Pay button is disabled while the request is in flight.
- AC-6.2 A repeated request with the same `idempotency_key` returns the original order and creates no second order.

**F7 Cancellation with cutoff and refund result**

- *Behaviour:* `POST /api/customer/orders/:id/cancel`. The server compares `now` with the stored `cancel_cutoff`. The cancel dialog states the outcome before confirmation.
- AC-7.1 Before the cutoff: status `cancelled_free`, payment `refunded`, table and stock released, message 'Refund of ₹X initiated (mock)'.
- AC-7.2 After the cutoff and while status is `confirmed`: status `cancelled_late`, payment `forfeited`, table and stock released, with a warning in the dialog.
- AC-7.3 If status is `preparing`, `ready`, or `completed`, or `now >= slot_start`: the Cancel button is hidden and the API returns 409 `CANNOT_CANCEL`.
- AC-7.4 The client never computes the cutoff. It displays the server value.

**F8 My orders**

- *Behaviour:* `/orders` lists the user's orders (newest first). `/orders/[id]` shows items, slot, table, total, a status stepper, the cutoff line, and Cancel when allowed. It polls every 5 s.
- AC-8.1 A staff status change appears within 5 s.
- AC-8.2 A user can only open their own orders. Another user's order returns 404.

**F9 Staff queue and sold-out toggle**

- *Behaviour:* `/staff` has three columns or tabs: Upcoming (`confirmed`), Preparing, Ready. A card shows a short code (last 4 characters of the id, uppercase), customer name, items with quantity, slot time, table, and `Start by HH:MM`. A card whose `start_by` has passed while still `confirmed` shows an 'Overdue' badge. Sort is by `start_by` ascending. `/staff/menu` has an availability switch per item.
- AC-9.1 Allowed transitions are only `confirmed → preparing → ready → completed`. Anything else returns 409 `INVALID_TRANSITION`.
- AC-9.2 A new order appears within 5 s.
- AC-9.3 Turning an item off makes it unorderable for customers within 10 s. Existing orders are unaffected.

**F10 Manager dashboard**

- *Behaviour:* KPI cards: Orders today, Active orders, Revenue (sum of totals where payment is `paid` or `forfeited`), Free cancellations, Late cancellations. Below: an orders table with a status filter, and a table-occupancy grid for the current slot. Polls every 10 s.
- AC-10.1 KPI numbers match the orders table.
- AC-10.2 The occupancy grid shows a table as taken if an active order holds it in the current slot.

**F11 Manager camera panel**

- *Behaviour:* A panel on `/manager` with a Start camera button. It calls `navigator.mediaDevices.getUserMedia({ video: true })` and shows a 16:9 preview with a red 'LIVE · not recorded' label. Stop releases every track.
- AC-11.1 Permission denied shows an error state with steps to allow the camera.
- AC-11.2 Leaving the page stops the stream.
- AC-11.3 No code records, captures, or uploads frames.
- AC-11.4 Only the manager role can load the page that contains the panel.

**F12 Seed data and demo accounts**

- *Behaviour:* `supabase/seed.sql` creates 10 tables, 14 menu items across 4 categories (stock 30 each, prep 3 to 15 min, at least two items at 10 min or longer), and `allowed_emails` rows for 1 manager, 1 staff, 2 faculty/student demo users. Demo passwords are set in the Supabase dashboard and kept in the README, never in the repo's code.
- AC-12.1 A fresh database plus the seed shows a full menu and 10 free tables.
- AC-12.2 All four demo accounts can log in.

## 3. UI/UX design

### 3.1 Pages and navigation

| Route | Role | Purpose |
| --- | --- | --- |
| `/login` | Public | Google and demo login |
| `/menu` | Student, faculty | Browse, add to cart |
| `/checkout` | Student, faculty | Steps: Slot, Table, Review and Pay |
| `/orders` | Student, faculty | Order list |
| `/orders/[id]` | Student, faculty | Order detail, cancel |
| `/staff` | Staff, manager | Order queue |
| `/staff/menu` | Staff, manager | Availability toggles |
| `/manager` | Manager | Dashboard and camera |

**Navigation.** Customer: bottom tab bar on mobile (Menu, Cart, Orders, Account) and top bar on desktop. Staff: top tabs (Queue, Menu). Manager: single page with a top bar. Every header shows the user's name, a role badge, and Log out. Each role has a home route and is redirected there from routes that are not theirs (a manager may open `/staff`).

### 3.2 Component hierarchy

- `RootLayout`
  - `AuthGuard` (reads session and role, redirects)
  - `ToastProvider`
  - `CustomerLayout` (`TopBar`, `BottomTabs`, `CartProvider`)
    - `MenuPage` → `CategoryTabs` → `MenuGrid` → `MenuCard` (`QtyStepper`, `AvailabilityBadge`)
    - `CartDrawer` → `CartLine`
    - `CheckoutPage` → `Stepper` → `SlotList` (`SlotButton`) → `TableGrid` (`TableTile`) → `ReviewPanel` (`CutoffNotice`, `PayButton`, `MockPaySheet`)
    - `OrdersPage` → `OrderCard` (`StatusBadge`)
    - `OrderDetailPage` → `StatusStepper`, `CancelDialog`
  - `StaffLayout` (`TopTabs`)
    - `QueuePage` → `QueueColumn` → `StaffOrderCard` (`StartByLabel`, `ActionButton`)
    - `StaffMenuPage` → `AvailabilityRow` (`Switch`)
  - `ManagerLayout`
    - `ManagerPage` → `KpiRow` (`KpiCard`) · `OrdersTable` (`StatusFilter`) · `OccupancyGrid` · `CameraPanel`

Shared UI primitives (`Button`, `Card`, `Badge`, `Modal`, `Skeleton`, `EmptyState`, `ErrorBanner`) live in `components/ui` and are created in the foundation commit.

### 3.3 Layout

- **Customer:** one column, max width 480 px centred on desktop. Sticky bottom bar holds the primary action (Add to cart, Continue, Pay).
- **Staff:** three columns at 1024 px and above, a tabbed single column below. Cards are large, with one full-width action button.
- **Manager:** KPI row on top, then a two-column area (orders table on the left, occupancy grid and camera on the right).

### 3.4 Design direction

Warm, food-friendly, high contrast, minimal. Card-based, `rounded-xl`, soft shadows, no gradients, no decorative illustrations. One primary colour used only for the main action on each screen. Status is shown with text plus colour.

### 3.5 Colour palette

| Token | Hex | Use |
| --- | --- | --- |
| `primary` | `#D9480F` | Main buttons, active tab |
| `primary-dark` | `#B33C0B` | Hover and pressed |
| `bg` | `#FFF9F2` | Page background |
| `surface` | `#FFFFFF` | Cards, modals |
| `border` | `#E9DFD3` | Dividers |
| `text` | `#1F2937` | Body text |
| `muted` | `#6B7280` | Secondary text |
| `success` | `#2F9E44` | Ready, free table |
| `warning` | `#F59F00` | Preparing, Only N left |
| `danger` | `#E03131` | Overdue, late cancel, errors |
| `info` | `#1971C2` | Confirmed |
| `neutral` | `#868E96` | Completed, cancelled free, taken table |

### 3.6 Typography

Inter (via `next/font`), with `system-ui, sans-serif` as the fallback. Sizes: page title 24 px bold, section title 20 px semibold, body 16 px, small 14 px (minimum). The staff screen uses 18 px body text.

### 3.7 Responsive behaviour

Mobile-first with Tailwind breakpoints (`sm` 640, `md` 768, `lg` 1024). Menu grid: 1 column on mobile, 2 at `sm`, 3 at `lg`. Staff: tabs below `lg`, three columns at `lg`. Manager is designed for 1366 × 768 and must not break on mobile, but mobile is not a target.

### 3.8 Loading, success, error and empty states

| Screen | Loading | Empty | Error | Success |
| --- | --- | --- | --- | --- |
| Menu | 6 skeleton cards | 'No items in this category' | Banner 'Couldn't load menu' + Retry | Cart badge updates |
| Checkout slots | 6 skeleton rows | 'No slots left today' | Banner + Retry | Slot highlighted |
| Table grid | 10 skeleton tiles | 'No free tables' + 'Pick another slot' | `TABLE_TAKEN` toast, grid refreshes | Tile highlighted |
| Pay | Spinner in modal, button disabled | n/a | Inline error in modal, Pay re-enabled | Redirect to order page + toast 'Order confirmed' |
| Orders | Skeleton rows | 'No orders yet' + Go to menu | Banner + Retry | n/a |
| Cancel | Button spinner | n/a | Toast with server message | Toast with refund or no-refund text |
| Staff queue | Skeleton cards | 'No orders in this column' | Banner; polling continues | Card moves column |
| Manager | Skeleton KPIs and rows | 'No orders yet today' | Banner + Retry | n/a |
| Camera | 'Starting camera…' | 'Camera is off' + Start | 'Camera access blocked' with steps | Live preview and red label |

## 4. Technical architecture

| Layer | Choice | Why it suits six hours |
| --- | --- | --- |
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + SWR + `lucide-react` + `sonner` (toasts). No other UI libraries | Antigravity agents know it well. File-based routing keeps the two developers in separate folders. SWR gives polling with one line (`refreshInterval`) |
| Backend | Next.js Route Handlers in the same repo | One codebase and one deploy. No second server to configure |
| Database | Supabase Postgres | Hosted in minutes, free tier. Constraints and SQL functions give correctness without extra services |
| Business logic | SQL functions `place_order` and `cancel_order` (atomic, locked per slot) | Removes the race conditions that would otherwise show up in a live demo |
| Auth | Supabase Auth: Google provider plus email and password for demo accounts, cookie sessions via `@supabase/ssr` | No custom auth to write. Demo accounts let judges log in without a college email |
| Validation | `zod` schemas in `lib/schemas.ts`, shared by client and server | One definition of every request shape, so the two agents cannot drift |
| Payments | Mock. UI delay and a DB status only | A real gateway can take hours and adds no value to the central idea |
| Camera | Browser `getUserMedia` in a client component | No server, no keys, no streaming infrastructure |
| AI/ML | None in P0 or P1. P2 stretch: people counting with MediaPipe or TF.js in the browser on the same webcam stream | Avoids model setup, GPUs, and API keys during the hackathon |
| Realtime | Polling (5 s staff and orders, 10 s others) | Far less likely to fail than websockets |
| Deployment | Vercel (app and API) + Supabase (database and auth). **Fallback:** `npm run build && npm start` on the Manager laptop at `localhost` | Both have free tiers and deploy from Git. `localhost` also satisfies the webcam's secure-context requirement |

**Deliberately not used:** Redis, queues, a separate Node server, Docker, websockets, ORMs, state-management libraries, and any paid service.

## 5. System design

### 5.1 High-level architecture

```
 Customer phone    Staff tablet    Manager laptop (webcam)
 (Next.js UI)      (Next.js UI)    (Next.js UI + getUserMedia)
        |               |               |
        +---------------+---------------+
                        |  HTTPS + JSON + session cookie
          Next.js Route Handlers  (/api/*)
          requireRole() + zod validation + getNow()
                        |  service-role key (server only)
          Supabase Postgres  +  Supabase Auth
          tables, partial unique indexes,
          place_order(), cancel_order()
```

The browser talks to Supabase directly only to sign in (anon key). All other data goes through `/api/*`. Camera video never leaves the Manager's browser.

### 5.2 Data flow

**Login.** Browser signs in with Supabase (Google or demo password) → calls `POST /api/auth/bootstrap` → server checks `allowed_emails` and the domain → creates or reads the `profiles` row → returns role and home route (or signs the user out with `EMAIL_NOT_ALLOWED`).

**Place order.**

1. Client loads menu, builds the cart in memory, then calls `GET /slots?maxPrep&qty`.
2. User picks a slot, client calls `GET /tables?slotStart`, user picks a table.
3. Pay tapped: client calls `POST /orders` with a fresh `idempotencyKey`.
4. Handler validates with zod, calls `place_order(...)` with `getNow()`, maps errors to codes, and returns the `Order`.
5. Client redirects to `/orders/[id]`, which polls every 5 s.

**Cancel.** Client calls `POST /orders/:id/cancel` → `cancel_order(...)` locks the row, compares `now` with `cancel_cutoff`, sets the status and payment outcome, restores stock → response carries the outcome the UI displays.

**Kitchen.** Staff polls `GET /staff/orders` every 5 s → taps an action → `PATCH /staff/orders/:id/status` does a compare-and-set update (`where id = $1 and status = $expected`). Zero rows updated means 409 `INVALID_TRANSITION`.

**Manager.** Polls `GET /manager/dashboard` every 10 s. The camera panel is purely client-side.

### 5.3 Database schema

Run as `supabase/schema.sql`. Enable RLS on every table and add no policies, so only the server's service-role key can read or write.

```sql
create extension if not exists pgcrypto;

create type user_role as enum ('student','faculty','staff','manager');
create type order_status as enum ('confirmed','preparing','ready','completed','cancelled_free','cancelled_late','no_show');
create type payment_status as enum ('paid','refunded','forfeited');

create table allowed_emails (
  email text primary key,              -- always lowercase
  role  user_role not null
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
  name text not null,
  category text not null check (category in ('Meals','Snacks','Beverages','Desserts')),
  price_inr integer not null check (price_inr > 0),
  prep_minutes integer not null check (prep_minutes between 1 and 30),
  stock_remaining integer not null default 30 check (stock_remaining >= 0),
  is_available boolean not null default true,
  emoji text not null default ''
);

create table canteen_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,          -- T1..T10
  seats integer not null check (seats in (2,4,6))
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
  start_by timestamptz not null,       -- slot_start - max_prep_minutes
  cancel_cutoff timestamptz not null,  -- slot_start - greatest(min_cancel_minutes, max_prep_minutes)
  idempotency_key uuid not null unique,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A table holds one order per slot. Cancelled and no-show orders release it.
create unique index uq_active_table_slot on orders (table_id, slot_start)
  where status in ('confirmed','preparing','ready','completed');

-- D10: one active order per user per slot.
create unique index uq_active_user_slot on orders (user_id, slot_start)
  where status in ('confirmed','preparing','ready','completed');

create index idx_orders_slot on orders (slot_start);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  name text not null,                  -- snapshot at order time
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
insert into app_settings default values;
```

**`place_order(p_user_id uuid, p_table_id uuid, p_slot_start timestamptz, p_items jsonb, p_idempotency_key uuid, p_now timestamptz) returns uuid`** must do exactly this, in one transaction:

1. If an order with `p_idempotency_key` exists, return its id.
2. Take `pg_advisory_xact_lock(hashtext('slot:' || p_slot_start))`.
3. Reject with `INVALID_SLOT` unless `p_slot_start` is on a 30-minute boundary, inside open hours, on the same Asia/Kolkata date as `p_now`.
4. Lock the ordered `menu_items` rows (`for update`, ordered by id). Raise `ITEM_UNAVAILABLE` if any is missing, not available, or has less stock than requested. Reject quantities above 5 per item or above 10 total with `VALIDATION_ERROR`.
5. Compute `total_items`, `total_inr`, and `max_prep_minutes`.
6. `start_by = p_slot_start - max_prep`. If `p_now >= start_by`, raise `SLOT_TOO_SOON`.
7. `cancel_cutoff = p_slot_start - greatest(min_cancel_minutes, max_prep)` minutes.
8. Sum `total_items` of orders in this slot with status in (`confirmed`, `preparing`, `ready`, `completed`). If that sum plus the new items exceeds `kitchen_capacity_per_slot`, raise `KITCHEN_FULL`.
9. Insert the order. A unique violation on `uq_active_table_slot` raises `TABLE_TAKEN`. A unique violation on `uq_active_user_slot` raises `ALREADY_BOOKED_SLOT`.
10. Insert `order_items` with snapshots and decrement `stock_remaining`.
11. Return the order id.

Errors use `raise exception using message = 'CODE'`. The route handler maps each message to the HTTP status in 5.4.

**`cancel_order(p_order_id uuid, p_user_id uuid, p_now timestamptz) returns jsonb`:**

1. Lock the order row (`for update`). If it does not exist or belongs to another user, raise `NOT_FOUND`.
2. If `status <> 'confirmed'` or `p_now >= slot_start`, raise `CANNOT_CANCEL`.
3. If `p_now <= cancel_cutoff`: set `cancelled_free` and `refunded`. Otherwise set `cancelled_late` and `forfeited`.
4. Add each item's quantity back to `menu_items.stock_remaining`.
5. Set `cancelled_at` and `updated_at`. Return status, payment status, and `refundInr` (the total if refunded, otherwise 0).

**Slot availability** is computed in the `/slots` handler. Per slot: `freeTables = total tables - count of active orders`, `kitchenRemaining = capacity - sum(total_items of active orders)`. State precedence: `passed`, then `too_soon`, then `full_tables`, then `full_kitchen`, then `bookable`. Active means status in (`confirmed`, `preparing`, `ready`, `completed`).

### 5.4 API definitions

**Conventions.** Base path `/api`. JSON bodies. Session cookie auth. Timestamps are ISO 8601 UTC strings; the UI formats them in Asia/Kolkata. Success: `{ "data": ... }`. Failure: `{ "error": { "code": "...", "message": "..." } }`. The server always computes `now` through `getNow()` (real time plus `demo_clock_offset_minutes`).

| Method and path | Role | Request | Response `data` |
| --- | --- | --- | --- |
| `GET /api/health` | Public | none | `{ ok: true }` |
| `POST /api/auth/bootstrap` | Any signed-in | none | `{ profile: Profile, home: string }` |
| `GET /api/me` | Any | none | `{ profile: Profile }` |
| `GET /api/customer/menu` | Customer | none | `{ items: MenuItem[] }` |
| `GET /api/customer/slots?maxPrep=<int>&qty=<int>` | Customer | query | `{ now: string, slots: Slot[] }` |
| `GET /api/customer/tables?slotStart=<ISO>` | Customer | query | `{ tables: TableAvailability[] }` |
| `POST /api/customer/orders` | Customer | `PlaceOrderRequest` | `201 { order: Order }` |
| `GET /api/customer/orders` | Customer | none | `{ orders: Order[] }` (own, newest first) |
| `GET /api/customer/orders/:id` | Customer | none | `{ order: Order }` |
| `POST /api/customer/orders/:id/cancel` | Customer | none | `{ order: Order, outcome: { refunded: boolean, refundInr: number } }` |
| `GET /api/staff/orders` | Staff, manager | none | `{ orders: StaffOrder[] }` (today, statuses `confirmed`, `preparing`, `ready`, sorted by `startBy` ascending) |
| `PATCH /api/staff/orders/:id/status` | Staff, manager | `{ status: 'preparing' \| 'ready' \| 'completed' }` | `{ order: StaffOrder }` |
| `GET /api/staff/menu` | Staff, manager | none | `{ items: MenuItem[] }` |
| `PATCH /api/staff/menu/:id` | Staff, manager | `{ isAvailable: boolean }` (P1 adds `stockRemaining`) | `{ item: MenuItem }` |
| `GET /api/manager/dashboard` | Manager | none | `{ kpis: Kpis, orders: StaffOrder[], occupancy: { slotStart: string \| null, tables: TableAvailability[] } }` |
| `PATCH /api/manager/settings` (P1) | Manager | `{ demoClockOffsetMinutes: number }` | `{ demoClockOffsetMinutes: number }` |

The manager dashboard `orders` are all of today's orders in any status, newest first. `occupancy` uses the slot containing `getNow()`, or `null` outside open hours.

**Request and response examples**

```json
POST /api/customer/orders
{
  "slotStart": "2026-11-12T07:30:00.000Z",
  "tableId": "<uuid>",
  "items": [{ "menuItemId": "<uuid>", "quantity": 2 }],
  "idempotencyKey": "<uuid generated per checkout attempt>"
}

201 { "data": { "order": { "id": "...", "shortCode": "A7K2", "status": "confirmed",
  "paymentStatus": "paid", "slotStart": "2026-11-12T07:30:00.000Z",
  "startBy": "2026-11-12T07:15:00.000Z", "cancelCutoff": "2026-11-12T07:15:00.000Z",
  "canCancel": true, "willRefund": true } } }

409 { "error": { "code": "TABLE_TAKEN", "message": "That table was just booked. Pick another." } }
```

**Error codes**

| Code | HTTP | Meaning |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Role not allowed |
| `EMAIL_NOT_ALLOWED` | 403 | Email is neither on the college domain nor allowlisted |
| `NOT_FOUND` | 404 | Missing, or not owned by the caller |
| `VALIDATION_ERROR` | 400 | Failed zod validation or quantity limits |
| `INVALID_SLOT` | 400 | Slot not on boundary, outside hours, or not today |
| `ITEM_UNAVAILABLE` | 409 | Item missing, switched off, or insufficient stock |
| `SLOT_TOO_SOON` | 409 | `now >= startBy` |
| `KITCHEN_FULL` | 409 | Slot kitchen capacity exceeded |
| `TABLE_TAKEN` | 409 | Table already held for the slot |
| `ALREADY_BOOKED_SLOT` | 409 | The user already has an active order in that slot |
| `CANNOT_CANCEL` | 409 | Status or time forbids cancellation |
| `INVALID_TRANSITION` | 409 | Status change not allowed |
| `INTERNAL` | 500 | Unexpected error (message never exposes internals) |

### 5.5 Shared data models

Source of truth is `lib/types.ts`, created in the foundation commit. Both agents import from it and may not redefine these shapes.

```ts
export type Role = 'student' | 'faculty' | 'staff' | 'manager';
export type OrderStatus = 'confirmed' | 'preparing' | 'ready' | 'completed'
  | 'cancelled_free' | 'cancelled_late' | 'no_show';
export type PaymentStatus = 'paid' | 'refunded' | 'forfeited';
export type SlotState = 'bookable' | 'full_tables' | 'full_kitchen' | 'too_soon' | 'passed';
export type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'EMAIL_NOT_ALLOWED' | 'NOT_FOUND'
  | 'VALIDATION_ERROR' | 'INVALID_SLOT' | 'ITEM_UNAVAILABLE' | 'SLOT_TOO_SOON'
  | 'KITCHEN_FULL' | 'TABLE_TAKEN' | 'ALREADY_BOOKED_SLOT' | 'CANNOT_CANCEL'
  | 'INVALID_TRANSITION' | 'INTERNAL';

export interface Profile { id: string; email: string; fullName: string; role: Role }

export interface MenuItem {
  id: string; name: string;
  category: 'Meals' | 'Snacks' | 'Beverages' | 'Desserts';
  priceInr: number; prepMinutes: number;
  stockRemaining: number; isAvailable: boolean; emoji: string;
}

export interface CartLine { menuItemId: string; quantity: number }
export interface PlaceOrderRequest {
  slotStart: string; tableId: string; items: CartLine[]; idempotencyKey: string;
}

export interface Slot {
  slotStart: string; state: SlotState; freeTables: number; kitchenRemaining: number;
}
export interface TableAvailability { id: string; label: string; seats: number; isFree: boolean }

export interface OrderItem {
  menuItemId: string; name: string; unitPriceInr: number; prepMinutes: number; quantity: number;
}
export interface Order {
  id: string; shortCode: string;            // last 4 chars of id, uppercase
  slotStart: string; startBy: string; cancelCutoff: string;
  status: OrderStatus; paymentStatus: PaymentStatus;
  totalInr: number; totalItems: number;
  table: { id: string; label: string; seats: number };
  items: OrderItem[];
  canCancel: boolean;   // status === 'confirmed' && now < slotStart (server clock)
  willRefund: boolean;  // now <= cancelCutoff (server clock)
  createdAt: string;
}
export interface StaffOrder extends Order { customerName: string; isOverdue: boolean }

export interface Kpis {
  ordersToday: number; activeOrders: number; revenueInr: number;
  freeCancellations: number; lateCancellations: number;
}
export interface ApiError { error: { code: ErrorCode; message: string } }
```

`isOverdue` is true when `status === 'confirmed'` and `now >= startBy`. Active orders means status in (`confirmed`, `preparing`, `ready`). Orders today means orders whose `slotStart` falls on today's Asia/Kolkata date.

### 5.6 External service dependencies

| Service | Used for | Needed at demo time |
| --- | --- | --- |
| Supabase (Postgres + Auth) | Data, sessions | Yes |
| Google OAuth (through Supabase) | College-email sign-in | Only for Google login. Demo login does not need it |
| Vercel | Hosting | Only if deployed. Not needed for the `localhost` fallback |
| Google Fonts (`next/font`) | Inter font | No. A fallback font is configured |
| Browser camera permission | Webcam preview | Yes, but no internet |

## 6. Technical constraints

### 6.1 Credentials and configuration

| Variable | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`, Vercel | From Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local`, Vercel | Safe for the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, Vercel | **Server only.** Never prefixed `NEXT_PUBLIC_`, never committed |
| `COLLEGE_EMAIL_DOMAIN` | `.env.local`, Vercel | Example: `yourcollege.edu.in`. **Needed from you** |
| `NEXT_PUBLIC_DEMO_LOGIN` | `.env.local`, Vercel | `true` for the hackathon |
| `APP_TIMEZONE` | `.env.local`, Vercel | `Asia/Kolkata` |

**One-time setup (owner: Member B in the foundation phase)**

1. Create a Supabase project. Run `schema.sql`, then `seed.sql`.
2. In Google Cloud Console, create an OAuth client (type Web). Add the Supabase callback URL (`https://<project>.supabase.co/auth/v1/callback`) as an authorised redirect URI. Put the client ID and secret into Supabase, under Authentication, Providers, Google.
3. In Supabase Auth URL settings, add `http://localhost:3000` and the Vercel URL to the redirect allow-list.
4. Create the four demo users with passwords in the Supabase dashboard and insert their emails into `allowed_emails`.
5. Commit `.env.example` (variable names only). Share real values over a private channel, never in the repository.

### 6.2 Internet dependencies

Supabase, Google sign-in, and (if deployed) Vercel all need internet. The camera does not. If the venue Wi-Fi is unreliable, use a phone hotspot and keep the backup video ready.

### 6.3 Potential integration problems and fallbacks

| Problem | Likelihood | Fallback |
| --- | --- | --- |
| Google OAuth redirect or consent-screen errors | High | Demo login (email and password). Google login becomes an add-on, not a blocker |
| Judges have no college email | Certain | Demo accounts, and the `allowed_emails` allowlist |
| **Demo is run outside 09:00-16:00, so no slots are bookable** | High | Before the demo, run `update app_settings set open_time='00:00', close_time='23:30';`. Reset afterward if wanted |
| Cannot demonstrate a late cancellation (the window between cutoff and `startBy` is only a few minutes for short-prep items) | High | Use the demo clock control (see Section 8, item 3). Otherwise pre-place an order in the right window |
| Webcam blocked, absent, or page not on HTTPS or `localhost` | Medium | Run on `localhost`. P1: loop a sample video in the same panel. Last resort: screenshot slide |
| Time-zone bugs (slots computed in UTC) | High | Every time calculation goes through `lib/time.ts` (`getNow()`, `generateSlots()`, `formatIst()`). Test with a fixed `now` |
| Two agents change shared code or contracts | High | File ownership in 7.2. `lib/types.ts` and `lib/schemas.ts` are frozen after 0:45 |
| Agent-written code drifts from the contract | Medium | Each developer runs `npm run typecheck` before every push and tells the agent to read Sections 5.4 and 5.5 first |
| Vercel build fails on missing environment variables | Medium | Add all variables in Vercel before the first deploy. Deploy an empty skeleton at the 0:45 checkpoint |
| Seed script run twice duplicates rows | Medium | Write `seed.sql` with `on conflict do nothing` and unique labels |
| Total internet failure | Low | Pre-recorded demo video |

## 7. Scope control

### 7.1 Time plan (6 hours)

| Time | Phase | Exit checkpoint |
| --- | --- | --- |
| 0:00-0:45 | **Foundation** (both) | Repo and scaffold on `main`; `lib/*`, `components/ui` committed; schema, functions, and seed run; all four demo accounts log in and reach their home route; skeleton deployed to Vercel |
| 0:45-2:45 | **Parallel build** | A: F2, F3, F4, F8 UI and read endpoints. B: F5 and F7 handlers first (by 1:30), then F9, F10, F11 |
| 2:45-3:30 | **Integration** | Full journey works on one machine: order, staff, cancel, manager. Concurrency test: 20 parallel requests for one table, one winner |
| 3:30-4:15 | **Deploy and verify** | Same journey works on the Vercel URL with demo login. Camera works on `localhost` and on HTTPS |
| 4:15-5:00 | **Polish** | Loading, empty, and error states from 3.8. Mobile check at 360 px. Realistic seed data |
| 5:00-5:30 | **Rehearse** | Two full demo run-throughs. Record the backup video |
| 5:30-6:00 | **Buffer** | P1 items only if everything above is green. Otherwise rest and fix |

**If behind, cut in this order:** (1) polish and animations; (2) manager orders-table filter; (3) status stepper replaced by a text status; (4) Google login, keeping demo login only. **Never cut:** atomic `place_order`, the cancellation cutoff and refund outcome, the staff queue, and the camera panel.

### 7.2 Ownership and file boundaries

The two Antigravity agents must be told: *edit only the paths you own.*

| Member | Role | Owns |
| --- | --- | --- |
| **A** | Customer experience | `app/login/**`, `app/(customer)/**`, `components/customer/**`, `lib/cart.tsx`, `app/api/auth/**`, `app/api/me/**`, `app/api/customer/menu/**`, `app/api/customer/slots/**`, `app/api/customer/tables/**`, `app/api/customer/orders/[id]/route.ts` |
| **B** | Orders engine, kitchen, manager | `supabase/**`, `app/api/customer/orders/route.ts` (GET list and POST), `app/api/customer/orders/[id]/cancel/**`, `app/(staff)/**`, `app/(manager)/**`, `components/staff/**`, `components/manager/**`, `app/api/staff/**`, `app/api/manager/**` |
| **Shared, frozen after 0:45** | Contracts and base | `lib/types.ts`, `lib/schemas.ts`, `lib/api.ts`, `lib/time.ts`, `lib/auth.ts`, `lib/supabase/**`, `components/ui/**`, Tailwind config, `package.json` |

Changes to a frozen file are made by one member after telling the other, in a small separate commit. New dependencies need an announcement first.

**Git:** `main` plus branches `a/customer` and `b/engine`. Small commits. Rebase on `main` every 30 minutes. Merge to `main` when a checkpoint is green.

### 7.3 Definition of done (demo script)

1. Student demo account logs in, adds 2 items, picks a slot and table, taps Pay, and sees the confirmed order with its cutoff line.
2. Staff account sees that order in the queue with its `Start by` time, then moves it to Preparing and Ready.
3. A second order is cancelled before the cutoff: refund message, table and stock released.
4. A third order is cancelled after the cutoff: no-refund warning, status `cancelled_late`.
5. Two browsers race for the same table: one succeeds, one sees the `TABLE_TAKEN` message.
6. Manager account shows matching KPIs, the occupancy grid, and the live camera preview.

## 8. Open items for your approval

1. **College email domain** for `COLLEGE_EMAIL_DOMAIN` (for example `yourcollege.edu.in`).
2. **Assumptions D1, D2 (hours), D5, D8 (tables), D9 (kitchen capacity), D10, D11, D12, D14.** Confirm or change each.
3. **Demo clock control.** I recommend promoting it from P1 to P0 (about 20 minutes of work), because without it the late-cancellation step of the demo is hard to show reliably. Do you agree?
4. **Google login.** Does either of you have a Google account to create the OAuth client? If not, we drop to demo login only and skip step 2 of 6.1.
5. **Ownership split in 7.2.** Member B carries the heavier backend and database load early. Is that acceptable, or would you like to swap the roles?

After your corrections I will freeze this as v1.0 and prepare the master development prompt for the two agents.
