import { randomInt } from "node:crypto";

/** Bump when Terms or Privacy change in a way users must re-accept; stored per user at registration. */
export const TERMS_VERSION = "2026-10-15";

export type RegistrationMode = "invite" | "open" | "closed";

/**
 * Read on every request (not cached) so flipping the env in Dokploy takes effect on redeploy
 * without code changes. Anything unrecognised means closed: a typo must never open signups.
 */
export function registrationMode(): RegistrationMode {
  const raw = (process.env.REGISTRATION_MODE ?? "invite").trim().toLowerCase();
  if (raw === "invite" || raw === "open" || raw === "closed") return raw;
  return "closed";
}

/** ADMIN_EMAILS is a comma-separated allow-list; an empty or missing value means nobody is admin. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

// No 0/O/1/I/L: codes get read out loud and typed from screenshots.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 10 characters from a 31-letter alphabet is about 49 bits; randomInt is uniform (no modulo bias). */
export function generateInviteCode(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** Codes are typed by hand, so tolerate case, spaces and dashes. */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[\s-]+/g, "").toUpperCase();
}
