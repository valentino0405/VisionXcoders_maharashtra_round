import "server-only";

/** Uses existing Clerk identity and a fail-closed server allowlist; no second auth system. */
export function isFairDropAdmin(clerkId: string): boolean {
  const configured = process.env.FAIRDROP_ADMIN_CLERK_IDS;
  if (!configured) return false;
  return configured.split(",").map((value) => value.trim()).filter(Boolean).includes(clerkId);
}
