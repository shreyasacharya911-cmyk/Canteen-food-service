import type { Role } from './types';

export const CUSTOMER_ROLES: Role[] = ['student', 'faculty'];
export const KITCHEN_ROLES: Role[] = ['staff', 'manager'];

export function homeFor(role: Role): string {
  if (role === 'staff') return '/staff';
  if (role === 'manager') return '/manager';
  return '/menu';
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@').pop() ?? '';
}

