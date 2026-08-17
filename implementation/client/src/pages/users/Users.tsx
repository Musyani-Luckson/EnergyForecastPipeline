import { useState } from "react";
import { AlertTriangle, Loader2, Lock, UserPlus, Users as UsersIcon } from "lucide-react";

import type { ServerRole, ServerUser } from "@/api/usersAPI";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/state-manager/hooks/authHook";
import { ROLES, canManageUsers, roleLabel } from "./roles";
import { useUsers } from "./useUsers";
import UserTable from "./UserTable";
import UserFormDialog from "./UserFormDialog";

/** Shown to anyone who isn't an administrator. */
function AccessDenied({ role }: { role: string | null }) {
  return (
    <div className="px-8 py-7">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
      <p className="text-sm text-slate-500 mt-1">User accounts, roles and access.</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
        <span className="mx-auto grid place-items-center size-12 rounded-full bg-slate-100 text-slate-400">
          <Lock size={22} />
        </span>
        <p className="text-sm font-semibold text-slate-800 mt-3">
          User administration is restricted to administrators
        </p>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          You’re signed in as{" "}
          <span className="font-medium text-slate-700">{roleLabel(role as ServerRole)}</span>. Creating
          accounts, changing roles and revoking access are handled by an administrator. Ask one to
          make the change for you.
        </p>
      </div>
    </div>
  );
}

export default function Users() {
  const { user, role } = useAuth();
  const isAdmin = canManageUsers(role);

  // Only administrators may call these endpoints, so don't even attempt the
  // fetch otherwise - it would 403 and surface a pointless error.
  const { users, loading, busy, error, add, changeRole, revoke, clearError } = useUsers(isAdmin);
  const [creating, setCreating] = useState(false);

  if (!isAdmin) return <AccessDenied role={role} />;

  const confirmRevoke = (target: ServerUser) => {
    const label = `${target.first_name} ${target.last_name}`.trim() || target.email;
    if (window.confirm(`Revoke access for ${label}? They will no longer be able to sign in.`)) {
      void revoke(target.id);
    }
  };

  const onChangeRole = (userId: number, next: ServerRole) => void changeRole(userId, next);

  const active = users.filter((u) => u.is_active !== false).length;
  const counts = ROLES.map((r) => ({
    ...r,
    count: users.filter((u) => u.role === r.key && u.is_active !== false).length,
  }));

  return (
    <div className="px-8 py-7 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? "Loading accounts…"
              : `${active} active account${active === 1 ? "" : "s"} of ${users.length}.`}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold transition"
        >
          <UserPlus size={15} /> New User
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {counts.map((r) => (
          <Badge key={r.key} variant={r.variant} className="gap-1.5">
            {r.label}
            <span className="font-bold tabular-nums">{r.count}</span>
          </Badge>
        ))}
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-600/20 px-4 py-3 text-sm text-rose-700">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
          </span>
          <button onClick={clearError} className="font-semibold hover:underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading users…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <span className="mx-auto grid place-items-center size-12 rounded-full bg-slate-100 text-slate-400">
            <UsersIcon size={22} />
          </span>
          <p className="text-sm font-medium text-slate-700 mt-3">No user accounts yet</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold transition"
          >
            <UserPlus size={15} /> Create the first user
          </button>
        </div>
      ) : (
        <UserTable
          users={users}
          currentUserId={user?.id ?? null}
          busy={busy}
          onChangeRole={onChangeRole}
          onRevoke={confirmRevoke}
        />
      )}

      <p className="text-[11px] text-slate-400">
        Only administrators can create accounts, change roles or revoke access. Managers run the
        forecasting pipeline but do not administer users.
      </p>

      {creating && (
        <UserFormDialog busy={busy} onClose={() => setCreating(false)} onSubmit={add} />
      )}
    </div>
  );
}
