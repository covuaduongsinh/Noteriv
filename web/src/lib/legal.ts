// Facts shared by /terms and /privacy. The owner fills the two operator fields in before launch;
// until then both pages show a "draft" banner so a half-finished text is never mistaken for final.
// Keep TERMS_VERSION in step with web/server/src/lib/registration.ts (stored per user at signup).

export const OPERATOR_NAME = ""; // set by the owner: full name of the individual operating Noteriv; the draft banner shows while empty
export const CONTACT_EMAIL = "duongsinhchess@gmail.com"; // public contact address for privacy / deletion requests

export const TERMS_VERSION = "2026-10-15";
export const LAST_UPDATED = "2026-10-15";

export const isDraft = !OPERATOR_NAME || !CONTACT_EMAIL;
