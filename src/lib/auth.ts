import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

// ─── Password hashing (scrypt, non-reversible) ───

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (candidate.length !== original.length) return false;
  return timingSafeEqual(candidate, original);
}

// ─── Session tokens (HMAC-signed JSON, stored in httpOnly cookie) ───

const SECRET =
  process.env.SESSION_SECRET || "brilliant-dev-secret-9f3a2c1b8e7d5f4a";

const CUSTOMER_COOKIE = "brilliant_customer";
const ADMIN_COOKIE = "brilliant_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  sub: string; // user id
  role: "CUSTOMER" | "ADMIN";
  name: string;
  iat: number;
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verifyToken(token: string): SessionPayload | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  if (mac.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (payload.iat + MAX_AGE * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Customer session ───

export async function setCustomerSession(customer: {
  id: string;
  name: string;
}) {
  const store = await cookies();
  const token = sign({
    sub: customer.id,
    role: "CUSTOMER",
    name: customer.name,
    iat: Date.now(),
  });
  store.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearCustomerSession() {
  const store = await cookies();
  store.delete(CUSTOMER_COOKIE);
}

export async function getCustomerSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "CUSTOMER") return null;
  return payload;
}

export async function getCurrentCustomer() {
  const session = await getCustomerSession();
  if (!session) return null;
  const customer = await db.customer.findUnique({ where: { id: session.sub } });
  return customer;
}

// ─── Admin session ───

export async function setAdminSession(admin: { id: string; name: string }) {
  const store = await cookies();
  const token = sign({
    sub: admin.id,
    role: "ADMIN",
    name: admin.name,
    iat: Date.now(),
  });
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "ADMIN") return null;
  return payload;
}

export async function getCurrentAdmin() {
  const session = await getAdminSession();
  if (!session) return null;
  const admin = await db.admin.findUnique({ where: { id: session.sub } });
  return admin;
}
