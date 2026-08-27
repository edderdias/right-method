const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:3333/api";

const ACCESS_TOKEN_KEY = "mc_access_token";
const REFRESH_TOKEN_KEY = "mc_refresh_token";
const VIEW_AS_STORAGE_KEY = "mc_view_as_user_id";

/** Endpoints that must always reflect the logged-in user's own identity, even while
 * "viewing as" a family member's shared account. */
const VIEW_AS_EXCLUDED_PREFIXES = ["/auth", "/users", "/family"];

/** Pre-auth endpoints: a 401 here is a real credential failure, not an expired session, so we
 * must not try to refresh (and `/auth/refresh` itself must never recurse). Everything else under
 * `/auth` (`/auth/me`, `/auth/sessions`, `/auth/logout`, ...) is a normal authenticated call. */
const NO_REFRESH_PREFIXES = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/2fa/",
  "/auth/webauthn/",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/resend-verification",
];

let viewAsUserId: string | null =
  typeof window === "undefined" ? null : localStorage.getItem(VIEW_AS_STORAGE_KEY);
const viewAsListeners = new Set<() => void>();

export function getViewAsUserId(): string | null {
  return viewAsUserId;
}

export function setViewAsUserId(userId: string | null): void {
  viewAsUserId = userId;
  if (typeof window !== "undefined") {
    if (userId) {
      localStorage.setItem(VIEW_AS_STORAGE_KEY, userId);
    } else {
      localStorage.removeItem(VIEW_AS_STORAGE_KEY);
    }
  }
  for (const listener of viewAsListeners) listener();
}

export function subscribeViewAsUserId(listener: () => void): () => void {
  viewAsListeners.add(listener);
  return () => viewAsListeners.delete(listener);
}

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

// --- Session tokens ---------------------------------------------------------
// Single source of truth for the auth tokens. `src/lib/auth.ts` re-exports these.

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setSessionTokens(tokens: { accessToken: string; refreshToken: string }): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function buildHeaders(hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {};
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAccessToken();
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

// --- Silent refresh --------------------------------------------------------
// On a 401 from an authenticated call we exchange the (rotating) refresh token for a fresh pair
// once, then replay the original request. Concurrent 401s share a single in-flight refresh.

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;
        const payload = (await response.json().catch(() => null)) as {
          data?: { accessToken?: string; refreshToken?: string };
        } | null;
        const data = payload?.data;
        if (!data?.accessToken || !data?.refreshToken) return false;
        setSessionTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function redirectToLogin(): void {
  clearSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.assign("/");
  }
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
  allowRefresh = true,
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

  if (
    response.status === 401 &&
    allowRefresh &&
    typeof window !== "undefined" &&
    !NO_REFRESH_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(method, path, body, false);
    }
    redirectToLogin();
    throw new ApiError("Sua sessão expirou. Faça login novamente.", 401);
  }

  return handleResponse<T>(response);
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const effectiveParams =
    viewAsUserId && !VIEW_AS_EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))
      ? { ...params, viewAs: viewAsUserId }
      : params;
  return request<T>("GET", `${path}${buildQueryString(effectiveParams)}`);
}

function assertNotViewingAsSomeoneElse(path: string): void {
  if (viewAsUserId && !VIEW_AS_EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    throw new ApiError(
      "Não é possível alterar dados enquanto visualiza a conta de outro usuário.",
      403,
      "FORBIDDEN",
    );
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  assertNotViewingAsSomeoneElse(path);
  return request<T>("POST", path, body);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  assertNotViewingAsSomeoneElse(path);
  return request<T>("PATCH", path, body);
}

export async function apiDelete<T>(path: string): Promise<T> {
  assertNotViewingAsSomeoneElse(path);
  return request<T>("DELETE", path);
}
