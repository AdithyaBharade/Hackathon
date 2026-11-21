import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";
import { ENDPOINTS } from "./endpoints";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send/receive httpOnly auth cookies
  timeout: 15000,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Requests that must never trigger a refresh attempt
const NO_REFRESH = [ENDPOINTS.auth.login, ENDPOINTS.auth.refresh, ENDPOINTS.auth.logout];

// Single in-flight refresh shared by all requests that 401 at the same time
let refreshPromise: Promise<void> | null = null;
const refreshSession = () =>
  (refreshPromise ??= api
    .post(ENDPOINTS.auth.refresh)
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    }));

/** Error with the API's per-field / per-row details kept (e.g. spreadsheet row errors). */
export class ApiRequestError extends Error {
  status?: number;
  errors?: unknown[];
  constructor(message: string, status?: number, errors?: unknown[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const toError = (error: AxiosError<{ message?: string; errors?: unknown[] }>) =>
  new ApiRequestError(error.response?.data?.message ?? error.message ?? "Something went wrong", error.response?.status, error.response?.data?.errors);

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ message?: string; errors?: unknown[] }>) => {
    const original = error.config as RetryConfig | undefined;
    const skip = !original || original._retry || NO_REFRESH.some((u) => original.url?.endsWith(u));

    if (error.response?.status === 401 && !skip) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original); // retry with the new access cookie
      } catch {
        useAuthStore.getState().clear(); // refresh failed -> session is over
        return Promise.reject(new Error("Session expired, please log in again"));
      }
    }
    return Promise.reject(toError(error));
  }
);
