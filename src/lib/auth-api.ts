export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  role?: string;
  guest: boolean;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const configuredUrl = import.meta.env["VITE_API_URL"] as string | undefined;
// Browsers use the deployment's public /api route, never an internal service URL.
const apiUrl = (configuredUrl ?? "").replace(/\/$/, "");

export async function authRequest<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(`auth/${path}`, body);
}

export async function apiRequest<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), path === "ai/chat" ? 40000 : 15000);
  try {
    response = await fetch(`${apiUrl}/api/${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers:
        body !== undefined
          ? { "Content-Type": "application/json", "X-Ares-CSRF": "1" }
          : ["GET", "HEAD"].includes(method.toUpperCase())
            ? {}
            : { "X-Ares-CSRF": "1" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
  } catch {
    throw new AuthError(
      "Não foi possível conectar à central. Verifique sua conexão e tente novamente.",
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const fallback =
      response.status >= 500
        ? "A central está temporariamente indisponível. Tente novamente em alguns instantes."
        : "Confira os dados informados e tente novamente.";
    throw new AuthError(typeof data?.detail === "string" ? data.detail : fallback, response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
