import axios from "axios";
import type { AuthResponse, LoginRequest } from "../types/auth";
import api from "./index";

// Mock API calls for authentication
const mockAuthResponse: AuthResponse = {
  success: true,
  token: "mock-jwt-token-123456",
  user: {
    userID: "usr_001",
    email: "manager@example.com",
    username: "manager",
    firstname: "John",
    lastname: "Doe",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    role: "FACILITY_MANAGER",
  },
};

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
    // const response = await api().get("/api/account/is-logged-in/");
    // console.log(response);
    return mockAuthResponse;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      return error.response;
    }
    throw error;
  }
};
