const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:3333/api";

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

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Tente novamente.", 0);
  }

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
