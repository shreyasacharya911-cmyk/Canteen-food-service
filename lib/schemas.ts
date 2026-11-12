import { z } from 'zod';

const uuid = z.string().uuid();

export const placeOrderSchema = z
  .object({
    slotStart: z.string().datetime(),
    tableId: uuid,
    items: z
      .array(z.object({ menuItemId: uuid, quantity: z.number().int().min(1).max(5) }))
      .min(1)
      .max(10),
    idempotencyKey: uuid,
  })
  .refine((v) => v.items.reduce((n, i) => n + i.quantity, 0) <= 10, {
    message: 'An order can have at most 10 items.',
  });

export const slotsQuerySchema = z.object({
  maxPrep: z.coerce.number().int().min(1).max(30).default(1),
  qty: z.coerce.number().int().min(1).max(10).default(1),
});

export const tablesQuerySchema = z.object({
  slotStart: z.string().datetime(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(['preparing', 'ready', 'completed']),
});

export const menuPatchSchema = z.object({
  isAvailable: z.boolean(),
});

export const settingsPatchSchema = z.object({
  demoClockOffsetMinutes: z.number().int().min(-720).max(720),
});

