import { NextResponse } from "next/server";
import { getCurrentAdmin, getCurrentCustomer } from "./auth";

// ─── Shared helpers for API routes (Task 2 — backend) ───

/** Error that maps directly to an Arabic JSON error response */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return errorResponse(err.status, err.message);
  }
  console.error("[api] unexpected error:", err);
  return errorResponse(500, "حدث خطأ غير متوقع، حاول مرة أخرى");
}

/** Wrap a route handler so ApiError becomes a JSON error response */
export function route<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

// Egyptian mobile phone: 010 / 011 / 012 / 015 + 8 digits
export const EGYPT_PHONE_RE = /^01[0125][0-9]{8}$/;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

export function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, message);
  }
  return value.trim();
}

export function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function requireNumber(value: unknown, message: string): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || Number.isNaN(n)) {
    throw new ApiError(400, message);
  }
  return n;
}

export function requireInt(value: unknown, message: string): number {
  const n = requireNumber(value, message);
  if (!Number.isInteger(n)) throw new ApiError(400, message);
  return n;
}

export function optionalNumberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Parse an optional ISO date from the body; null clears it */
export function optionalDateOrNull(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// ─── Auth guards (throw ApiError) ───

export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (!customer) throw new ApiError(401, "يجب تسجيل الدخول");
  return customer;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new ApiError(401, "غير مصرح");
  return admin;
}
