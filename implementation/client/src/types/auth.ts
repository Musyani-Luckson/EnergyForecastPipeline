export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  userID: string;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  createdAt: string;
  updatedAt: string;
  role: "FACILITY_MANAGER" | "ADMIN" | "USER";
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user: User;
  header?: string;
}
