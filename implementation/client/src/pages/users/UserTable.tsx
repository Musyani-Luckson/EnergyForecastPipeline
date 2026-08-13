import { Ban, ShieldCheck } from "lucide-react";

import type { ServerRole, ServerUser } from "@/api/usersAPI";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_BY_KEY } from "./roles";

interface UserTableProps {
  users: ServerUser[];
  /** Id of the signed-in administrator, so they can't lock themselves out. */
  currentUserId: number | null;
  busy: boolean;
  onChangeRole: (userId: number, role: ServerRole) => void;
  onRevoke: (user: ServerUser) => void;
}

const displayName = (u: ServerUser) => {
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.email;
};

export default function UserTable({
  users,
  currentUserId,
  busy,
  onChangeRole,
  onRevoke,
}: UserTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">User</TableHead>
            <TableHead className="px-4">Role</TableHead>
            <TableHead className="px-4">Status</TableHead>
            <TableHead className="px-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isSelf = currentUserId != null && u.id === currentUserId;
            const active = u.is_active !== false;
            // An admin editing their own row could strip their own access and
            // leave the system with no way back in.
            const locked = isSelf || busy;

            return (
              <TableRow key={u.id} className={cn(!active && "opacity-60")}>
                <TableCell className="px-4">
                  <span className="font-medium text-slate-800">{displayName(u)}</span>
                  <span className="block text-[11px] text-slate-400">{u.email}</span>
                </TableCell>

                <TableCell className="px-4">
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role ?? "user"}
                      disabled={locked || !active}
                      onChange={(e) => onChangeRole(u.id, e.target.value as ServerRole)}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      {ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {u.is_superuser && (
                      <Badge variant="warning" className="gap-1 text-[10px]">
                        <ShieldCheck size={10} /> Superuser
                      </Badge>
                    )}
                  </div>
                  {u.role && (
                    <span className="block text-[11px] text-slate-400 mt-1 max-w-[280px]">
                      {ROLE_BY_KEY[u.role]?.description}
                    </span>
                  )}
                </TableCell>

                <TableCell className="px-4">
                  <Badge variant={active ? "success" : "secondary"}>
                    {active ? "Active" : "Revoked"}
                  </Badge>
                  {isSelf && (
                    <span className="block text-[11px] text-slate-400 mt-1">You</span>
                  )}
                </TableCell>

                <TableCell className="px-4 text-right">
                  <button
                    onClick={() => onRevoke(u)}
                    disabled={locked || !active}
                    title={
                      isSelf
                        ? "You can’t revoke your own access"
                        : !active
                          ? "Access is already revoked"
                          : "Revoke this user’s access"
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent disabled:hover:border-slate-200"
                  >
                    <Ban size={13} /> Revoke
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
