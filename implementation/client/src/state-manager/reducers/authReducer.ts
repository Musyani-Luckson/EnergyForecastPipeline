import type { User } from "../../types/auth";

// ── State ─────────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const authInitialState: AuthState = {
  user: null,
  isAuthenticated: false,
  // Bootstrap runs on mount; stay in loading until it resolves so the app
  // never flashes the login page while the session is being restored.
  isLoading: true,
  error: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

export type AuthAction =
  | { type: "AUTH_REQUEST" }
  | { type: "LOGIN_SUCCESS"; payload: User }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; payload: Partial<User> }
  | { type: "CLEAR_ERROR" };

// ── Reducer ───────────────────────────────────────────────────────────────────

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_REQUEST":
      return { ...state, isLoading: true, error: null };

    case "LOGIN_SUCCESS":
      return {
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case "AUTH_FAILURE":
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload || null,
      };

    case "LOGOUT":
      return { ...authInitialState, isLoading: false };

    case "UPDATE_USER":
      if (!state.user) return state;
      return { ...state, user: { ...state.user, ...action.payload } };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}
