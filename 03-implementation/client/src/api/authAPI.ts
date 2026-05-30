import axios from "axios";
import type { LoginRequest } from "../types/auth";
import api from "./index";

// Signin
export const signin = async (data: LoginRequest) => {
  try {
    const response = await api().post("/api/account/login/", data);
    return response;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response;
    }
    throw error;
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await api().post("/api/account/logout/");
    localStorage.removeItem("token");
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      throw error;
    }
    throw error;
  }
};

// Get current signed-in user
export const getCurrentUser = async () => {
  try {
    const response = await api().get("/api/account/user/");
    return response;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response;
    }
    throw error;
  }
};
