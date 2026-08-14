const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:3333/api";

const ACCESS_TOKEN_KEY = "mc_access_token";

export class ApiError extends Error {
  status: number;
  code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function buildHeaders(hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  const token = getStoredAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function handleResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const rawMessage = payload?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(" ")
      : (rawMessage ?? "Não foi possível completar a solicitação.");
    throw new ApiError(message, response.status, payload?.code);
  }

  return payload as T;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    const init: RequestInit = { method, headers: buildHeaders(body !== undefined) };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Tente novamente.", 0);
  }

  return handleResponse<T>(response);
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  return request<T>("GET", `${path}${buildQueryString(params)}`);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>("PATCH", path, body);
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}
