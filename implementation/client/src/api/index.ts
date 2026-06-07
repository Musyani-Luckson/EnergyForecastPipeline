import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const baseApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

baseApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function api(customBaseUrl?: string) {
  if (!customBaseUrl) return baseApi;

  return axios.create({
    baseURL: customBaseUrl,
    headers: { "Content-Type": "application/json" },
  });
}

export default api;
