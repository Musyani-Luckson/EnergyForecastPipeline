import type { ApiErrorResponse } from "../../types/APIError";
import type { User } from "../../types/auth";

export interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: ApiErrorResponse | null;
}

export type UserAction =
  | { type: "LOGIN_REQUEST" }
  | { type: "LOGIN_SUCCESS"; payload: User }
  | { type: "LOGIN_FAILURE"; payload: ApiErrorResponse }
  | { type: "LOGOUT" }
  | { type: "SERVER_ERROR"; payload: ApiErrorResponse }
  | { type: "AUTH_FAILURE"; payload: ApiErrorResponse }
  | { type: "VALIDATION_FAILURE"; payload: ApiErrorResponse }
  | {
      type: "NETWORK_ERROR";
      payload: ApiErrorResponse;
    };

export const userReducer = (
  state: UserState,
  action: UserAction,
): UserState => {
  switch (action.type) {
    case "LOGIN_REQUEST":
      // case "SIGNUP_REQUEST":
      return { ...state, loading: true, error: null };
    case "LOGIN_SUCCESS":
      // case "SIGNUP_SUCCESS":
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload,
      };
    case "AUTH_FAILURE":
      // case "SIGNUP_FAILURE":
      return { ...state, loading: false, error: action.payload };
    case "LOGOUT":
      return { ...state, user: null, isAuthenticated: false };
    // case "UPDATE_USER":
    //   return { ...state, user: { ...state.user, ...action.payload } };
    case "NETWORK_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SERVER_ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};
