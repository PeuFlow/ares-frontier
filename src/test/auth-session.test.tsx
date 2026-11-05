import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MissionProvider, useMission } from "@/hooks/use-mission";

const fetchMock = vi.fn();
const explorer = { id: "123", name: "Explorador", email: "explorer@example.com", role: "explorer", guest: false };
const response = (status: number, data?: unknown) => ({
  ok: status >= 200 && status < 300, status, json: async () => data,
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("server authentication", () => {
  it("ignores a forged local explorer and restores the server session", async () => {
    localStorage.setItem("ares-frontier:mission:v1", JSON.stringify({ user: { ...explorer, name: "Forged" } }));
    fetchMock.mockResolvedValue(response(200, explorer));
    const { result } = renderHook(useMission, { wrapper: MissionProvider });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.user).toEqual(explorer);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/auth/me"), expect.objectContaining({ credentials: "include" }));
    expect(JSON.parse(localStorage.getItem("ares-frontier:mission:v1")!).user).toBeNull();
  });

  it("does not accept a local explorer without a server session", async () => {
    localStorage.setItem("ares-frontier:mission:v1", JSON.stringify({ user: explorer }));
    fetchMock.mockResolvedValue(response(401, { detail: "Sessão inválida" }));
    const { result } = renderHook(useMission, { wrapper: MissionProvider });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.user).toBeNull();
    await act(async () => { await result.current.enterGuest(); });
    expect(result.current.user?.guest).toBe(true);
  });

  it("logs in through the API and preserves session state when logout fails", async () => {
    fetchMock.mockResolvedValueOnce(response(401));
    const { result } = renderHook(useMission, { wrapper: MissionProvider });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    fetchMock.mockResolvedValueOnce(response(200, explorer));
    await act(async () => { await result.current.signIn(explorer.email, "private-password"); });
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/login"), expect.objectContaining({
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json", "X-Ares-CSRF": "1" },
      body: JSON.stringify({ email: explorer.email, password: "private-password" }),
    }));
    expect(localStorage.getItem("ares-frontier:mission:v1")).not.toContain("private-password");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await act(async () => { await expect(result.current.signOut()).rejects.toThrow("conectar"); });
    expect(result.current.user).toEqual(explorer);
    fetchMock.mockResolvedValueOnce(response(204));
    await act(async () => { await result.current.signOut(); });
    expect(result.current.user).toBeNull();
  });

  it("creates a server account and surfaces duplicate-email errors", async () => {
    fetchMock.mockResolvedValueOnce(response(401));
    const { result } = renderHook(useMission, { wrapper: MissionProvider });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    fetchMock.mockResolvedValueOnce(response(409, { detail: "E-mail indisponível" }));
    await act(async () => {
      await expect(result.current.register(explorer.name, explorer.email, "private-password")).rejects.toThrow("E-mail indisponível");
    });
    expect(result.current.user).toBeNull();
    fetchMock.mockResolvedValueOnce(response(201, explorer));
    await act(async () => { await result.current.register(explorer.name, explorer.email, "private-password"); });
    expect(result.current.user).toEqual(explorer);
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/register"), expect.objectContaining({ method: "POST" }));
    expect(localStorage.getItem("ares-frontier:mission:v1")).not.toContain("private-password");
  });
});
