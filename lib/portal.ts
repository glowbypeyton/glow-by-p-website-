/**
 * Shared server-side helpers for the client portal and the admin portal.
 *
 * Auth is Netlify Identity. Every request is authorised from the `nf_jwt`
 * cookie via `getUser()` — nothing trusts an id sent by the browser.
 */
import { getUser } from "@netlify/identity";
import { getStore } from "@netlify/blobs";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { clients } from "../db/schema.js";

/** Studio owner(s). Overridable per-site with the ADMIN_EMAILS env var. */
const DEFAULT_ADMIN_EMAILS = ["glow.by.peyton@gmail.com"];

export function adminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ADMIN_EMAILS;
}

type IdentityUser = Awaited<ReturnType<typeof getUser>>;

export function isAdminUser(user: IdentityUser): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase();
  if (email && adminEmails().includes(email)) return true;
  // An `admin` role assigned in the Netlify Identity dashboard also works.
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return roles.includes("admin") || user.role === "admin";
}

export interface Session {
  user: NonNullable<IdentityUser>;
  isAdmin: boolean;
}

export async function getSession(): Promise<Session | null> {
  const user = await getUser();
  if (!user) return null;
  return { user, isAdmin: isAdminUser(user) };
}

/** Full name as the client typed it at signup, falling back to their email. */
function nameFromUser(user: NonNullable<IdentityUser>): string {
  const metadata = (user.userMetadata || {}) as Record<string, unknown>;
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name : "";
  return (fullName || user.name || "").trim();
}

function phoneFromUser(user: NonNullable<IdentityUser>): string {
  const metadata = (user.userMetadata || {}) as Record<string, unknown>;
  return typeof metadata.phone === "string" ? metadata.phone.trim() : "";
}

/**
 * Returns the client row for an Identity user, creating it on first sight so
 * that a brand new account shows up in the admin portal right away.
 */
export async function ensureClient(user: NonNullable<IdentityUser>) {
  const email = user.email || "";
  const existing = await db
    .select()
    .from(clients)
    .where(eq(clients.identityId, user.id))
    .limit(1);

  if (existing.length) {
    const client = existing[0];
    // Keep the email in sync if it was changed in Identity.
    if (email && client.email !== email) {
      const [updated] = await db
        .update(clients)
        .set({ email, updatedAt: new Date() })
        .where(eq(clients.id, client.id))
        .returning();
      return updated;
    }
    return client;
  }

  const [created] = await db
    .insert(clients)
    .values({
      identityId: user.id,
      email,
      fullName: nameFromUser(user),
      phone: phoneFromUser(user),
    })
    .returning();
  return created;
}

/* ---------------------------------------------------------------- responses */

export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export const fail = (message: string, status: number) => json({ error: message }, status);
export const unauthorized = () => fail("Please sign in to continue.", 401);
export const forbidden = () => fail("You do not have access to this.", 403);
// 404 is deliberately avoided: a function that answers 404 lets Netlify fall
// back to static/404 handling, which can swallow the JSON body the portal
// pages rely on. Missing records answer 400 with a readable message instead.
export const notFound = () => fail("That record could not be found.", 400);
export const badRequest = (message = "That request was not valid.") => fail(message, 400);

/* -------------------------------------------------------------------- input */

export function toId(value: string | undefined): number | null {
  const id = Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function text(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export function cents(value: unknown): number {
  const amount = Math.round(Number(value) * 100);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.min(amount, 100_000_000);
}

/** "2026-08-25" — accepts a date input value, falls back to today. */
export function isoDate(value: unknown): string {
  const candidate = text(value, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return candidate;
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------- photos */

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface DecodedImage {
  bytes: Uint8Array;
  contentType: string;
}

/**
 * Decodes a `data:image/jpeg;base64,...` payload. The browser downscales and
 * re-encodes photos before upload, which keeps requests well inside the
 * serverless body limit.
 */
export function decodeImageDataUrl(dataUrl: unknown): DecodedImage | null {
  if (typeof dataUrl !== "string") return null;
  const match = /^data:([a-z/+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) return null;

  const contentType = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) return null;

  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;

  return { bytes: new Uint8Array(buffer), contentType };
}

export const progressPhotoStore = () => getStore("progress-photos");
export const reviewPhotoStore = () => getStore("review-photos");

/** Blob keys are random so a key can never be guessed from a client id. */
export function newBlobKey(prefix: string): string {
  return `${prefix}/${Date.now().toString(36)}-${crypto.randomUUID()}`;
}
