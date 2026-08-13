import axios from "axios";
import type { LoginRequest } from "../types/auth";
import baseApi, { setAccessToken } from "./index";

export const signin = async (data: LoginRequest) => {
  try {
    const response = await baseApi.post("/api/accounts/login/", data);
    setAccessToken(response.data.tokens.access);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await baseApi.post("/api/accounts/logout/");
    setAccessToken(null);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const refreshToken = async () => {
  try {
    const response = await baseApi.post("/api/accounts/refresh/");
    setAccessToken(response.data.tokens.access);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await baseApi.get("/api/accounts/me/");

    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};
