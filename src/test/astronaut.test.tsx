import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AstroBuddy } from "@/components/frontier/AstroBuddy";
import { recentHistory, type AIMessage } from "@/lib/ai-api";

const state = vi.hoisted(() => ({
  user: { id: "explorer", guest: false },
  chat: vi.fn(),
  section: vi.fn(),
  context: { section: "territorios", element_id: "valles-07" },
}));
vi.mock("@/hooks/use-mission", () => ({ useMission: () => ({ user: state.user }) }));
vi.mock("@/hooks/use-astronaut-context", () => ({
  useAstronautContext: () => state.context,
}));
vi.mock("@/lib/ai-api", async (original) => ({
  ...(await original<typeof import("@/lib/ai-api")>()),
  astronautChat: state.chat,
  sectionContext: state.section,
}));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/",
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

beforeEach(() => {
  state.user = { id: "explorer", guest: false };
  state.context = { section: "territorios", element_id: "valles-07" };
  state.chat.mockReset().mockResolvedValue({ message: "Vamos explorar Valles!" });
  state.section.mockReset().mockResolvedValue({ message: "Conheça os territórios." });
});
afterEach(cleanup);
function show() {
  render(<AstroBuddy />);
  fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
  fireEvent.click(screen.getByText("Conversar com o astronauta"));
}

describe("astronaut conversation", () => {
  it("speaks AI explanations from the moving character instead of a separate panel", async () => {
    render(<AstroBuddy />);
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Soltar astronauta"));
    await waitFor(
      () =>
        expect(screen.getByLabelText("Fala do astronauta")).toHaveTextContent(
          "Conheça os territórios.",
        ),
      { timeout: 2500 },
    );
    const balloon = screen.getByLabelText("Fala do astronauta");
    expect(balloon.parentElement?.querySelector('svg[viewBox="0 0 52 60"]')).not.toBeNull();
    expect(screen.queryByLabelText("Guia astronauta")).not.toBeInTheDocument();
    expect(state.section).toHaveBeenCalledWith({ section: "territorios", element_id: "valles-07" });
    fireEvent.click(document.body);
    expect(balloon).toHaveTextContent("Conheça os territórios.");
    fireEvent.click(screen.getByLabelText("Fechar explicação"));
    expect(screen.queryByLabelText("Fala do astronauta")).not.toBeInTheDocument();
  });

  it("shows thinking on the character and ignores a response for the previous context", async () => {
    let resolve!: (value: { message: string }) => void;
    state.section.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const view = render(<AstroBuddy />);
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Soltar astronauta"));
    await waitFor(
      () =>
        expect(screen.getByLabelText("Fala do astronauta")).toHaveTextContent(
          "Consultando o diário",
        ),
      { timeout: 2500 },
    );
    state.context = { section: "territorios", element_id: "jezero-j021" };
    view.rerender(<AstroBuddy />);
    await act(async () => {
      resolve({ message: "Resposta antiga de Valles" });
    });
    expect(screen.queryByText("Resposta antiga de Valles")).not.toBeInTheDocument();
  });

  it("offers exploration and chat from the same ship on touch devices", () => {
    render(<AstroBuddy />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Soltar astronauta"));
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    expect(screen.getByText("Recolher astronauta")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Conversar com o astronauta"));
    expect(screen.getByRole("dialog")).toHaveTextContent("Astronauta a bordo");
  });

  it("renders assistant emphasis and lists without raw asterisks", async () => {
    state.chat.mockResolvedValue({
      message: "Algumas opções:\n* **Órbita Vermelha**\n* **Horizonte de Valles**",
    });
    show();
    fireEvent.change(screen.getByLabelText("Mensagem para o astronauta"), {
      target: { value: "Quais viagens existem?" },
    });
    fireEvent.click(screen.getByLabelText("Enviar mensagem"));
    const trip = await screen.findByText("Órbita Vermelha");
    expect(trip.tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("log").textContent).not.toContain("*");
  });

  it("sends by Enter, preserves turns and clears a new conversation", async () => {
    show();
    const input = screen.getByLabelText("Mensagem para o astronauta");
    fireEvent.change(input, { target: { value: "Oi" } });
    fireEvent.submit(input.closest("form")!);
    expect(await screen.findByText("Vamos explorar Valles!")).toBeInTheDocument();
    expect(screen.getByText("Oi")).toBeInTheDocument();
    expect(state.chat).toHaveBeenCalledWith("Oi", [], {
      section: "territorios",
      element_id: "valles-07",
    });
    fireEvent.click(screen.getByText("Nova conversa"));
    expect(screen.queryByText("Vamos explorar Valles!")).not.toBeInTheDocument();
  });

  it("blocks duplicate submissions and ignores late responses after reset", async () => {
    let resolve!: (value: { message: string }) => void;
    state.chat.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    show();
    const input = screen.getByLabelText("Mensagem para o astronauta");
    fireEvent.change(input, { target: { value: "Onde começo?" } });
    fireEvent.submit(input.closest("form")!);
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(state.chat).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Enviar mensagem")).toBeDisabled();
    fireEvent.click(screen.getByText("Nova conversa"));
    resolve({ message: "Resposta antiga" });
    await waitFor(() => expect(screen.queryByText("Resposta antiga")).not.toBeInTheDocument());
  });

  it("restores the draft after a connection failure", async () => {
    state.chat.mockRejectedValue(new Error("Rádio indisponível"));
    show();
    const input = screen.getByLabelText("Mensagem para o astronauta");
    fireEvent.change(input, { target: { value: "Quais habitats existem?" } });
    fireEvent.click(screen.getByLabelText("Enviar mensagem"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Rádio indisponível");
    expect(input).toHaveValue("Quais habitats existem?");
    expect(screen.getByLabelText("Enviar mensagem")).toBeEnabled();
  });

  it("does not send empty messages or requests for guests", () => {
    state.user.guest = true;
    show();
    expect(screen.getByLabelText("Enviar mensagem")).toBeDisabled();
    expect(screen.getByText("Entre na sua conta")).toBeInTheDocument();
    expect(state.chat).not.toHaveBeenCalled();
  });

  it("limits history to complete turns and the server character budget", () => {
    const messages: AIMessage[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: "a".repeat(2000),
    }));
    const history = recentHistory(messages);
    expect(history).toHaveLength(4);
    expect(history[0]?.role).toBe("user");
    expect(history.at(-1)?.role).toBe("assistant");
  });
});
