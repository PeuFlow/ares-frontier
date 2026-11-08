import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "@/routes/admin";

const state = vi.hoisted(() => ({
  user: { id: "admin-id", role: "admin", guest: false },
  refreshUser: vi.fn(),
}));
vi.mock("@/hooks/use-mission", () => ({ useMission: () => state }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const fetchMock = vi.fn();
const entry = {
  id: "explorer-id",
  name: "Ana Explorer",
  email: "ana@example.com",
  role: "explorer",
  is_active: true,
  created_at: "2026-11-01T12:00:00Z",
};
const list = { users: [entry], total: 1, active: 2, admins: 1 };
const response = (status: number, data: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminPage />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  state.user = { id: "admin-id", role: "admin", guest: false };
  fetchMock
    .mockReset()
    .mockImplementation(async (url: string) =>
      response(200, url.includes("deletion-logs") ? { logs: [], total: 0 } : list),
    );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("user administration", () => {
  it("blocks explorers before querying personal data", () => {
    state.user.role = "explorer";
    show();
    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("searches users through the API", async () => {
    show();
    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar por nome ou e-mail"), {
      target: { value: "ana" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar usuários" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining("q=ana"),
        expect.objectContaining({ credentials: "include" }),
      ),
    );
  });

  it("edits and deactivates a user with a protected API request", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Editar Ana Explorer" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Updated" } });
    fireEvent.click(screen.getByLabelText("Conta ativa"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await screen.findByText("Cadastro atualizado.");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("admin/users/explorer-id"),
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Ares-CSRF": "1" },
        body: JSON.stringify({
          name: "Ana Updated",
          email: "ana@example.com",
          role: "explorer",
          is_active: false,
        }),
      }),
    );
  });

  it("validates password confirmation before sending a protected reset request", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Alterar senha de Ana Explorer" }));
    const save = screen.getByRole("button", { name: "Salvar nova senha" });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "short" } });
    fireEvent.click(save);
    expect(screen.getByRole("alert")).toHaveTextContent("Use uma senha entre 12 e 128 caracteres.");
    const password = "a-new-long-password-123";
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: password } });
    fireEvent.click(save);
    expect(screen.getByRole("alert")).toHaveTextContent("As senhas não coincidem.");
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/password"))).toBe(false);
    fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
      target: { value: password },
    });
    fireEvent.click(save);
    await screen.findByText("Senha atualizada. As sessões da conta foram encerradas.");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("admin/users/explorer-id/password"),
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Ares-CSRF": "1" },
        body: JSON.stringify({ password }),
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Alterar senha de Ana Explorer" }));
    expect(screen.getByLabelText("Nova senha")).toHaveValue("");
    expect(screen.getByLabelText("Confirmar nova senha")).toHaveValue("");
  });

  it("shows a password reset failure and lets the admin cancel", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/password")
        ? response(403, { detail: "Acesso exclusivo para administradores." })
        : response(200, url.includes("deletion-logs") ? { logs: [], total: 0 } : list),
    );
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Alterar senha de Ana Explorer" }));
    for (const label of ["Nova senha", "Confirmar nova senha"])
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: "a-new-long-password-123" },
      });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Acesso exclusivo para administradores.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows access revocation without exposing cached user details", async () => {
    fetchMock.mockResolvedValue(
      response(403, { detail: "Acesso exclusivo para administradores." }),
    );
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Acesso exclusivo para administradores.",
    );
    expect(screen.queryByText("ana@example.com")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo usuário" })).toBeDisabled();
  });

  it("requires confirmation, sends DELETE with CSRF, and refreshes the audit trail", async () => {
    let deleted = false;
    fetchMock.mockImplementation(async (url: string, options: RequestInit) => {
      if (options.method === "DELETE") {
        deleted = true;
        return response(204, null);
      }
      if (url.includes("deletion-logs"))
        return response(200, {
          total: deleted ? 1 : 0,
          logs: deleted
            ? [
                {
                  id: "log-id",
                  actor_name: "Admin",
                  actor_email: "admin@example.com",
                  user_name: entry.name,
                  user_email: entry.email,
                  deleted_at: "2026-11-07T12:30:00Z",
                },
              ]
            : [],
        });
      return response(200, deleted ? { ...list, users: [], total: 0, active: 1 } : list);
    });
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir Ana Explorer" }));
    const confirm = screen.getByRole("button", { name: "Excluir permanentemente" });
    expect(confirm).toBeDisabled();
    expect(deleted).toBe(false);
    fireEvent.change(screen.getByLabelText("Digite o e-mail do usuário para confirmar"), {
      target: { value: entry.email },
    });
    fireEvent.click(confirm);
    await screen.findByText("Usuário excluído. A ação foi registrada no histórico.");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("admin/users/explorer-id"),
      expect.objectContaining({ method: "DELETE", headers: { "X-Ares-CSRF": "1" } }),
    );
    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("1 exclusões registradas")).toBeInTheDocument();
  });

  it("can cancel deletion and disables deletion of the current admin", async () => {
    state.user.id = entry.id;
    const view = show();
    expect(await screen.findByRole("button", { name: "Excluir Ana Explorer" })).toBeDisabled();
    view.unmount();
    state.user.id = "admin-id";
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir Ana Explorer" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options.method === "DELETE")).toBe(false);
  });

  it("keeps the dialog open and shows a deletion error", async () => {
    fetchMock.mockImplementation(async (url: string, options: RequestInit) =>
      options.method === "DELETE"
        ? response(409, { detail: "Esta conta possui registros vinculados." })
        : response(200, url.includes("deletion-logs") ? { logs: [], total: 0 } : list),
    );
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir Ana Explorer" }));
    fireEvent.change(screen.getByLabelText("Digite o e-mail do usuário para confirmar"), {
      target: { value: entry.email },
    });
    fireEvent.click(screen.getByRole("button", { name: "Excluir permanentemente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esta conta possui registros vinculados.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
