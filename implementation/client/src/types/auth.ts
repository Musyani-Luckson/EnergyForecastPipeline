export type Role = "admin" | "manager" | "user";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_superuser: boolean;
  is_staff: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Shape returned by /login/, /refresh/ and /me/ (build_auth_response). */
export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  tokens?: { access: string };
}
