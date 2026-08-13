import baseApi from "./index";

/** Server roles (apps.accounts.models.Account.Roles). */
export type ServerRole = "admin" | "manager" | "user";

export interface ServerUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: ServerRole | null;
  is_superuser: boolean;
  /**
   * Only the list endpoint returns this — `serialize_user` omits it, and the
   * create/update/revoke responses use that serializer directly. Callers
   * should refetch the list after a mutation rather than trust the response.
   */
  is_active?: boolean;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function listUsers(): Promise<ServerUser[]> {
  const res = await baseApi.get<Envelope<ServerUser[]>>("/api/accounts/users/list/");
  return res.data.data;
}

export async function createUser(payload: {
  email: string;
  password: string;
  role: ServerRole;
  first_name?: string;
  last_name?: string;
}): Promise<ServerUser> {
  const res = await baseApi.post<Envelope<ServerUser>>("/api/accounts/users/create/", payload);
  return res.data.data;
}

export async function updateUserRole(userId: number, role: ServerRole): Promise<ServerUser> {
  const res = await baseApi.put<Envelope<ServerUser>>("/api/accounts/users/permissions/", {
    user_id: userId,
    role,
  });
  return res.data.data;
}

export async function revokeUser(userId: number): Promise<ServerUser> {
  const res = await baseApi.post<Envelope<ServerUser>>("/api/accounts/users/revoke/", {
    user_id: userId,
  });
  return res.data.data;
}
