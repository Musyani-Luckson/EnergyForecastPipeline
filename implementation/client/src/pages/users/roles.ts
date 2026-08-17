import type { Role } from "@/types/auth";
import type { ServerRole } from "@/api/usersAPI";

/**
 * Who may administer user accounts.
 *
 * Administration is admin-only: managers run the forecasting pipeline but do
 * not create accounts, change roles or revoke access. This mirrors the server,
 * where every endpoint under /api/accounts/users/ carries `IsAdmin` - the UI
 * gate is for clarity, not for security, and a manager who reached these calls
 * anyway would still be refused with a 403.
 */
export const canManageUsers = (role: Role | null): boolean => role === "admin";

export interface RoleMeta {
  key: ServerRole;
  label: string;
  description: string;
  /** Badge variant from the shared UI palette. */
  variant: "default" | "secondary" | "info" | "warning" | "success";
}

export const ROLES: RoleMeta[] = [
  {
    key: "admin",
    label: "Administrator",
    description: "Full access, including user administration.",
    variant: "warning",
  },
  {
    key: "manager",
    label: "Manager",
    description: "Runs datasets through the pipeline and reviews forecasts. No user administration.",
    variant: "info",
  },
  {
    key: "user",
    label: "User",
    description: "Views datasets and forecasts. Read-only.",
    variant: "secondary",
  },
];

export const ROLE_BY_KEY: Record<ServerRole, RoleMeta> = Object.fromEntries(
  ROLES.map((r) => [r.key, r]),
) as Record<ServerRole, RoleMeta>;

export const roleLabel = (role: ServerRole | null): string =>
  role ? (ROLE_BY_KEY[role]?.label ?? role) : "No role";
