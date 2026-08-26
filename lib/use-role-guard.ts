import { useAuth } from "@/lib/auth-context";

/**
 * Role hierarchy: owner (null) > admin > editor > viewer
 *
 * viewer  — read-only: dashboard + analytics only
 * editor  — create/edit content, no settings/billing/team/delete-campaign
 * admin   — everything except settings/billing
 * null    — owner, full access
 */

const RANK: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };

/**
 * Returns true if the current user can perform the given minimum role action.
 * Owners (role === null) always pass.
 */
export function useCanAccess(minRole: "viewer" | "editor" | "admin"): boolean {
  const { role } = useAuth();
  if (role === null) return true; // owner — full access
  return (RANK[role] ?? 0) >= RANK[minRole];
}

/**
 * Returns the current role, or "owner" if not a team member.
 */
export function useRole(): string {
  const { role } = useAuth();
  return role ?? "owner";
}
