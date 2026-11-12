# Requests for Member B

- Please export `fetchOrderById(orderId: string, userId: string): Promise<Order | null>` (or throw `NOT_FOUND`) from `lib/orders.ts` using `getNow()` and `toIso()` so `GET /api/customer/orders/[id]` can delegate directly.

