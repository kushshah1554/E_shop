import axios, { type AxiosRequestConfig } from "axios";
import { env } from "./env";
import type { ApiEnvelope } from "./types";

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setApiTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

function getErrorMsg(err: unknown) {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data.errors?.[0].message || err.message || "request failed"
    );
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "request failed";
}

const api = axios.create({
  baseURL: env.backendUrl,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

api.interceptors.request.use(async (config) => {
  if (!tokenGetter) return config;
  const token = await tokenGetter();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function apiGet<TResponse>(url: string, config?: AxiosRequestConfig) {
  try {
    const response = await api.get<ApiEnvelope<TResponse>>(url, config);
    if (response.data.status === "error" || !response.data.data) {
      throw new Error(response.data.errors?.[0].message || "response error");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMsg(error));
  }
}

export async function apiPost<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  try {
    const response = await api.post<ApiEnvelope<TResponse>>(url, body, config);
    if (response.data.status === "error" || !response.data.data) {
      throw new Error(response.data.errors?.[0].message || "response error");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMsg(error));
  }
}

export async function apiPut<TResponse, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  try {
    const response = await api.put<ApiEnvelope<TResponse>>(url, body, config);
    if (response.data.status === "error" || !response.data.data) {
      throw new Error(response.data.errors?.[0].message || "response error");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMsg(error));
  }
}

export async function apiDelete<TResponse>(
  url: string,
  config?: AxiosRequestConfig,
) {
  try {
    const response = await api.put<ApiEnvelope<TResponse>>(url, config);
    if (response.data.status === "error" || !response.data.data) {
      throw new Error(response.data.errors?.[0].message || "response error");
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMsg(error));
  }
}
