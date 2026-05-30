import { useReducer, type ReactNode, useEffect } from "react";
import { userReducer } from "../reducers/authReducer";
import { AuthContext, initialState } from "../hooks/useAuth";
import { getCurrentUser } from "../../api/authAPI";

interface UserProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: UserProviderProps) => {
  const [state, dispatch] = useReducer(userReducer, initialState);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Loading staing
        dispatch({ type: "LOGIN_REQUEST" });
        const response = await getCurrentUser();

        if (response.status === 200) {
          const { success, user } = response.data;
          if (!success) {
            dispatch({
              type: "LOGIN_FAILURE",
              payload: response.data.errors,
            });
          }
          dispatch({ type: "LOGIN_SUCCESS", payload: user });
        } else {
          dispatch({
            type: "SERVER_ERROR",
            payload: {
              success: false,
              error: {
                type: "SERVER_ERROR",
                message: "Something failed",
              },
              meta: {
                timestamp: new Date().toISOString(),
                path: "/api/user",
                method: "GET",
              },
            },
          });
        }
      } catch {
        dispatch({
          type: "SERVER_ERROR",
          payload: {
            success: false,
            error: {
              type: "SERVER_ERROR",
              message: "Something failed",
            },
            meta: {
              timestamp: new Date().toISOString(),
              path: "/api/user",
              method: "GET",
            },
          },
        });
      }
    };

    fetchUser();
  }, [dispatch]);

  return (
    <AuthContext.Provider value={{ state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
