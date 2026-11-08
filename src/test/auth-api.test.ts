import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthError, authRequest } from "@/lib/auth-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authentication service errors", () => {
  it.each(["login", "register"])(
    "reports a plain-text server failure during %s as service unavailability",
    async (path) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("A server error has occurred\nFUNCTION_INVOCATION_FAILED", {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          }),
        ),
      );

      await expect(authRequest(path, {})).rejects.toMatchObject({
        name: "Error",
        status: 500,
        message:
          "A central está temporariamente indisponível. Tente novamente em alguns instantes.",
      });
    },
  );

  it("preserves the API's explanation for rejected credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "E-mail ou senha inválidos." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const error = await authRequest("login", {}).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(AuthError);
    expect(error).toMatchObject({ status: 401, message: "E-mail ou senha inválidos." });
  });
});
