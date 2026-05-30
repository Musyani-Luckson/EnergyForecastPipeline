export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user: User;
  data?: string;
}

export interface Role {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Status {
  id: number;
  type_id: number;
  name: string;
  description: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  email_verified: boolean;
  createdAt: string;
  updatedAt: string;
  role: Role;
  status: Status;
  //   statusID: number;
  //   role_id: number;
}
