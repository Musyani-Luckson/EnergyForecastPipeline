import { createContext, useContext, type Dispatch } from "react";
import { signin } from "../../api/authAPI";
import type { UserAction, UserState } from "../reducers/authReducer";
import type {
  LoginRequest,
  // User
} from "../../types/auth";

export const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const AuthContext = createContext<{
  state: UserState;
  dispatch: Dispatch<UserAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

export const useUser = () => {
  const { state, dispatch } = useContext(AuthContext);

  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: "LOGIN_REQUEST" });
      const response = await signin(credentials);
      if (response.status === 200) {
        const { success, token, user } = response.data;
        if (!success) {
          dispatch({
            type: "AUTH_FAILURE",
            payload: response.data.errors,
          });
        }
        localStorage.setItem("token", token);
        dispatch({ type: "LOGIN_SUCCESS", payload: user });
      } else {
        dispatch({ type: "AUTH_FAILURE", payload: response.data.errors });
      }
    } catch {
      // dispatch({ type: "NETWORK_ERROR", payload: response.data.errors });
    }
  };

  //   const signup = async (credentials: SignupRequest) => {
  //     try {
  //       dispatch({ type: "SIGNUP_REQUEST" });
  //       const response = await signupUser(credentials);
  //       if (response.status === 200) {
  //         const { success, token, user } = response.data;
  //         if (!success) {
  //           dispatch({
  //             type: "SIGNUP_FAILURE",
  //             payload: response.data.errors,
  //           });
  //         }
  //         localStorage.setItem("token", token);
  //         dispatch({ type: "SIGNUP_SUCCESS", payload: user });
  //       } else {
  //         dispatch({ type: "SIGNUP_FAILURE", payload: response.data.errors });
  //       }
  //     } catch {
  //       dispatch({ type: "NETWORK_FAILURE" });
  //     }
  //   };
  const logout = async () => {
    try {
      // dispatch({ type: "SIGNUP_REQUEST" });
      // await logout();
      localStorage.removeItem("token");

      dispatch({ type: "LOGOUT" });
    } catch {
      // dispatch({ type: "NETWORK_ERROR", payload: response.data.errors });
    }
  };

  //   const updateUser = (data: User) =>
  //     dispatch({ type: "UPDATE_USER", payload: data });

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    // signup,
    logout,
    // updateUser,
  };
};
