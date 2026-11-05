import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPage } from "@/routes/admin";

const state = vi.hoisted(() => ({ user: { id: "admin-id", role: "admin", guest: false }, refreshUser: vi.fn() }));
vi.mock("@/hooks/use-mission", () => ({ useMission: () => state }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...await original<typeof import("@tanstack/react-router")>(),
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}));

const fetchMock = vi.fn();
const entry = { id: "explorer-id", name: "Ana Explorer", email: "ana@example.com", role: "explorer", is_active: true, created_at: "2026-11-01T12:00:00Z" };
const list = { users: [entry], total: 1, active: 2, admins: 1 };
const response = (status: number, data: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><AdminPage /></QueryClientProvider>);
}
beforeEach(() => {
  state.user = { id: "admin-id", role: "admin", guest: false };
  fetchMock.mockReset().mockResolvedValue(response(200, list));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
    fireEvent.change(screen.getByLabelText("Buscar por nome ou e-mail"), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar usuários" }));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("q=ana"), expect.objectContaining({ credentials: "include" })));
  });

  it("edits and deactivates a user with a protected API request", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Editar Ana Explorer" }));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana Updated" } });
    fireEvent.click(screen.getByLabelText("Conta ativa"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await screen.findByText("Cadastro atualizado.");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("admin/users/explorer-id"), expect.objectContaining({
      method: "PUT", headers: { "Content-Type": "application/json", "X-Ares-CSRF": "1" },
      body: JSON.stringify({ name: "Ana Updated", email: "ana@example.com", role: "explorer", is_active: false }),
    }));
  });

  it("shows access revocation without exposing cached user details", async () => {
    fetchMock.mockResolvedValue(response(403, { detail: "Acesso exclusivo para administradores." }));
    show();
    expect(await screen.findByRole("alert")).toHaveTextContent("Acesso exclusivo para administradores.");
    expect(screen.queryByText("ana@example.com")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Novo usuário" })).toBeDisabled();
  });
});
