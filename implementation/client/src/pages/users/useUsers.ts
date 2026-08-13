import { useCallback, useEffect, useState } from "react";

import {
  createUser, listUsers, revokeUser, updateUserRole,
  type ServerRole, type ServerUser,
} from "@/api/usersAPI";

export interface NewUser {
  email: string;
  password: string;
  role: ServerRole;
  first_name?: string;
  last_name?: string;
}

interface UseUsersResult {
  users: ServerUser[];
  loading: boolean;
  /** Set while a create/update/revoke is in flight. */
  busy: boolean;
  error: string | null;
  reload: () => Promise<void>;
  add: (user: NewUser) => Promise<boolean>;
  changeRole: (userId: number, role: ServerRole) => Promise<boolean>;
  revoke: (userId: number) => Promise<boolean>;
  clearError: () => void;
}

/** Pull a server message out of an axios-style error, falling back to `fallback`. */
function messageFrom(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: { message?: unknown }; status?: number } })?.response;
  if (body?.status === 403) {
    return "You don’t have permission to manage users.";
  }
  const message = body?.data?.message;
  return typeof message === "string" && message ? message : fallback;
}

/**
 * User administration state.
 *
 * Mutations always refetch rather than patching local state: the
 * create/update/revoke responses use `serialize_user`, which omits `is_active`,
 * so splicing them into the list would silently drop each user's status.
 */
export function useUsers(enabled: boolean): UseUsersResult {
  const [users, setUsers] = useState<ServerUser[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setUsers(await listUsers());
      setError(null);
    } catch (err) {
      setError(messageFrom(err, "Could not load users."));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    // `loading` is initialised from `enabled`, so a disabled hook is already
    // settled — no setState needed here (it would trip the effect lint rule).
    if (!enabled) return;

    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await listUsers();
        if (active) {
          setUsers(data);
          setError(null);
        }
      } catch (err) {
        if (active) setError(messageFrom(err, "Could not load users."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled]);

  /** Run a mutation, surface its error, and resync the list on success. */
  const mutate = useCallback(
    async (action: () => Promise<unknown>, fallback: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await action();
        await reload();
        return true;
      } catch (err) {
        setError(messageFrom(err, fallback));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const add = useCallback(
    (user: NewUser) => mutate(() => createUser(user), "Could not create the user."),
    [mutate],
  );

  const changeRole = useCallback(
    (userId: number, role: ServerRole) =>
      mutate(() => updateUserRole(userId, role), "Could not update the role."),
    [mutate],
  );

  const revoke = useCallback(
    (userId: number) => mutate(() => revokeUser(userId), "Could not revoke access."),
    [mutate],
  );

  return {
    users,
    loading,
    busy,
    error,
    reload,
    add,
    changeRole,
    revoke,
    clearError: () => setError(null),
  };
}
