# Requests for Member B

1. `lib/orders.ts`: Please export `fetchOrderById(orderId: string, userId: string): Promise<Order>` (throwing `ApiError('NOT_FOUND')` when missing or not owned by `userId`) using `getNow()` and `toIso()`. (`app/api/customer/orders/[id]/route.ts` currently queries Supabase directly as a fallback and can switch to `fetchOrderById` once `lib/orders.ts` is on `main`.)
2. Customer endpoints called by Member A's UI (`components/customer/CheckoutFlow.tsx`, `app/(customer)/orders/page.tsx`, `app/(customer)/orders/[id]/page.tsx`):
   - `POST /api/customer/orders` returning `{ data: { order: Order } }`
   - `GET /api/customer/orders` returning `{ data: { orders: Order[] } }`
   - `POST /api/customer/orders/[id]/cancel` returning `{ data: { order: Order, outcome: { refunded: boolean, refundInr: number } } }`
