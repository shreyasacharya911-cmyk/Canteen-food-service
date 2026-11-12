import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { ErrorCode } from './types';

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  EMAIL_NOT_ALLOWED: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  INVALID_SLOT: 400,
  ITEM_UNAVAILABLE: 409,
  SLOT_TOO_SOON: 409,
  KITCHEN_FULL: 409,
  TABLE_TAKEN: 409,
  ALREADY_BOOKED_SLOT: 409,
  CANNOT_CANCEL: 409,
  INVALID_TRANSITION: 409,
  INTERNAL: 500,
};

export const MESSAGES: Record<ErrorCode, string> = {
  UNAUTHENTICATED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have access to this.',
  EMAIL_NOT_ALLOWED: 'Please use your college email (mite.ac.in).',
  NOT_FOUND: 'We could not find that.',
  VALIDATION_ERROR: 'The request was not valid.',
  INVALID_SLOT: 'That time slot is not available.',
  ITEM_UNAVAILABLE: 'One of the items is sold out or unavailable.',
  SLOT_TOO_SOON: 'That slot is too soon for the kitchen. Pick a later one.',
  KITCHEN_FULL: 'The kitchen is full for that slot. Pick another slot.',
  TABLE_TAKEN: 'That table was just booked. Pick another.',
  ALREADY_BOOKED_SLOT: 'You already have an order in that slot.',
  CANNOT_CANCEL: 'This order can no longer be cancelled.',
  INVALID_TRANSITION: 'That status change is not allowed.',
  INTERNAL: 'Something went wrong. Please try again.',
};

const CODES = Object.keys(STATUS) as ErrorCode[];

export class ApiError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message?: string) {
    super(message ?? MESSAGES[code]);
    this.code = code;
  }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function fail(code: ErrorCode, message?: string): NextResponse {
  return NextResponse.json({ error: { code, message: message ?? MESSAGES[code] } }, { status: STATUS[code] });
}

export function throwIfDb(error: { message: string } | null): void {
  if (!error) return;
  const code = CODES.find((c) => c !== 'INTERNAL' && error.message.includes(c));
  if (!code) console.error(error);
  throw new ApiError(code ?? 'INTERNAL');
}

export function handle<P = Record<string, string>>(
  fn: (req: Request, ctx: { params: P }) => Promise<Response>
) {
  return async (req: Request, ctx: { params: P }): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.code, e.message);
      console.error(e);
      return fail('INTERNAL');
    }
  };
}

export async function parseJson<T>(
  req: Request,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'Invalid JSON body.');
  }
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new ApiError('VALIDATION_ERROR', r.error.issues[0]?.message ?? MESSAGES.VALIDATION_ERROR);
  }
  return r.data;
}

export function parseQuery<T>(
  req: Request,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): T {
  const r = schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!r.success) {
    throw new ApiError('VALIDATION_ERROR', r.error.issues[0]?.message ?? MESSAGES.VALIDATION_ERROR);
  }
  return r.data;
}

