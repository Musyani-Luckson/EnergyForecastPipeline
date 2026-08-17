import { createContext, useContext, type Dispatch } from "react";
import { signin as apiLogin, logout as apiLogout } from "../../api/authAPI";
import type { AuthState, AuthAction } from "../reducers/authReducer";
import type { User, Role } from "../../types/auth";

// ── Context ───────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

// ── Public hook interface ───────────────────────────────────────────────────

export interface AuthHookValue {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Signs in against the backend; resolves true on success, false otherwise. */
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

// Maps a thrown API error (server body `{message}`, or a bare network failure)
// to a single user-facing message.
function authErrorMessage(err: unknown): string {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : null;

  const isNetworkFailure =
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    message === "Network Error";

  if (isNetworkFailure) {
    return "Cannot reach the server. Check your connection and try again.";
  }
  return message ?? "Unable to sign in. Please try again.";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthHookValue {
  const { state, dispatch } = useAuthContext();

  const login = async (email: string, password: string): Promise<boolean> => {
    // Clear any stale error, but do NOT touch the global `isLoading` flag:
    // that drives the route-guard "Verifying session…" screen, which is for
    // session bootstrap only. In-flight login state is local to the form.
    dispatch({ type: "CLEAR_ERROR" });
    try {
      // apiLogin stores the access token in memory (api/index) on success.
      const res = await apiLogin({ email, password });
      dispatch({ type: "LOGIN_SUCCESS", payload: res.data.user as User });
      return true;
    } catch (err) {
      dispatch({ type: "AUTH_FAILURE", payload: authErrorMessage(err) });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // apiLogout clears the access token + the server refresh cookie.
      await apiLogout();
    } catch {
      /* best effort - clear local state regardless */
    }
    dispatch({ type: "LOGOUT" });
  };

  const clearError = (): void => dispatch({ type: "CLEAR_ERROR" });

  return {
    user: state.user,
    role: state.user?.role ?? null,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    clearError,
  };
}
