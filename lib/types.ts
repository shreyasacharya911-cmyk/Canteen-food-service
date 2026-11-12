export type Role = 'student' | 'faculty' | 'staff' | 'manager';
export type OrderStatus =
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled_free'
  | 'cancelled_late'
  | 'no_show';
export type PaymentStatus = 'paid' | 'refunded' | 'forfeited';
export type SlotState = 'bookable' | 'full_tables' | 'full_kitchen' | 'too_soon' | 'passed';
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'EMAIL_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_SLOT'
  | 'ITEM_UNAVAILABLE'
  | 'SLOT_TOO_SOON'
  | 'KITCHEN_FULL'
  | 'TABLE_TAKEN'
  | 'ALREADY_BOOKED_SLOT'
  | 'CANNOT_CANCEL'
  | 'INVALID_TRANSITION'
  | 'INTERNAL';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Meals' | 'Snacks' | 'Beverages' | 'Desserts';
  priceInr: number;
  prepMinutes: number;
  stockRemaining: number;
  isAvailable: boolean;
  emoji: string;
}

export interface CartLine {
  menuItemId: string;
  quantity: number;
}

export interface PlaceOrderRequest {
  slotStart: string;
  tableId: string;
  items: CartLine[];
  idempotencyKey: string;
}

export interface Slot {
  slotStart: string;
  state: SlotState;
  freeTables: number;
  kitchenRemaining: number;
}

export interface TableAvailability {
  id: string;
  label: string;
  seats: number;
  isFree: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  unitPriceInr: number;
  prepMinutes: number;
  quantity: number;
}

export interface Order {
  id: string;
  shortCode: string;
  slotStart: string;
  startBy: string;
  cancelCutoff: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalInr: number;
  totalItems: number;
  table: { id: string; label: string; seats: number };
  items: OrderItem[];
  canCancel: boolean;
  willRefund: boolean;
  createdAt: string;
}

export interface StaffOrder extends Order {
  customerName: string;
  isOverdue: boolean;
}

export interface Kpis {
  ordersToday: number;
  activeOrders: number;
  revenueInr: number;
  freeCancellations: number;
  lateCancellations: number;
}

export interface DashboardData {
  kpis: Kpis;
  orders: StaffOrder[];
  occupancy: { slotStart: string | null; tables: TableAvailability[] };
  clock: { nowIso: string; demoClockOffsetMinutes: number };
}

