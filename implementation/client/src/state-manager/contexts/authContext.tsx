import { useReducer, useEffect, type ReactNode } from "react";
import { authReducer, authInitialState } from "../reducers/authReducer";
import { AuthContext } from "../hooks/authHook";
import { refreshToken } from "../../api/authAPI";
import type { User } from "../../types/auth";

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, authInitialState);

  // Session restoration on mount / page refresh.
  //
  // The access token lives in memory only, so it is gone after a refresh. The
  // httpOnly refresh cookie survives, so we call /refresh/ (which reads the
  // cookie, with no auth header) to mint a new access token and rehydrate the
  // user. `isLoading` stays true throughout - the route guards render a loader
  // during this window, so the login page never flashes.
  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      dispatch({ type: "AUTH_REQUEST" });
      try {
        const res = await refreshToken();
        if (!active) return;
        dispatch({ type: "LOGIN_SUCCESS", payload: res.data.user as User });
      } catch {
        if (!active) return;
        // No valid refresh cookie → unauthenticated (not an error to surface).
        dispatch({ type: "AUTH_FAILURE", payload: "" });
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}
