import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AstroBuddy } from "@/components/frontier/AstroBuddy";
import { recentHistory, type AIMessage } from "@/lib/ai-api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function show() {
  render(<AstroBuddy />);
  fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
  fireEvent.click(screen.getByText("Conversar com o astronauta"));
}

describe("astronaut conversation", () => {
  it("follows the pointer with the departure balloon visible and pauses only over its controls", () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      ...matchMedia(query),
      matches: query === "(pointer: fine)",
    }));
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => frames.delete(id));
    render(<AstroBuddy />);
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Soltar astronauta"));
    const explorer = document.querySelector<HTMLElement>("[data-astronaut-explorer]")!;
    expect(explorer.parentElement).toBe(document.body);
    const flushFrame = () =>
      act(() => {
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach((callback) => callback(16));
      });
    flushFrame();
    const start = explorer.style.transform;
    expect(screen.getByLabelText("Fala do astronauta")).toHaveTextContent("Partiu exploração!");
    fireEvent(
      document.body,
      new MouseEvent("pointermove", { bubbles: true, clientX: 500, clientY: 200 }),
    );
    flushFrame();
    expect(explorer.style.transform).not.toBe(start);
    // The balloon must remain operable without making the character chase its buttons.
    for (let i = 0; i < 200; i++) flushFrame();
    const settled = Number(explorer.style.transform.match(/translate3d\(([-\d.]+)/)?.[1]);
    fireEvent(
      screen.getByLabelText("Fechar explicação"),
      new MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 100 }),
    );
    flushFrame();
    expect(Number(explorer.style.transform.match(/translate3d\(([-\d.]+)/)?.[1])).toBeCloseTo(
      settled,
    );
  });

  it("keeps details open when operating the astronaut balloon above them", () => {
    const view = render(
      <>
        <AstroBuddy />
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Details</DialogTitle>
            <DialogDescription>Trip</DialogDescription>
          </DialogContent>
        </Dialog>
      </>,
    );
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Soltar astronauta"));
    const onOpenChange = vi.fn();
    view.rerender(
      <>
        <AstroBuddy />
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent>
            <DialogTitle>Details</DialogTitle>
            <DialogDescription>Trip</DialogDescription>
          </DialogContent>
        </Dialog>
      </>,
    );
    const pause = screen.getByText("Pausar explicações");
    fireEvent.pointerDown(pause);
    fireEvent.click(pause);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Details");
    expect(screen.getByText("Ativar explicações")).toBeInTheDocument();
  });

  it("explains a previously visited point again after returning to it", async () => {
    const view = render(<AstroBuddy />);
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Soltar astronauta"));
    await waitFor(() => expect(state.section).toHaveBeenCalledTimes(1), { timeout: 2500 });
    state.context = { section: "territorios", element_id: "jezero-j021" };
    view.rerender(<AstroBuddy />);
    await waitFor(() => expect(state.section).toHaveBeenCalledTimes(2), { timeout: 2500 });
    state.context = { section: "territorios", element_id: "valles-07" };
    view.rerender(<AstroBuddy />);
    await waitFor(() => expect(state.section).toHaveBeenCalledTimes(3), { timeout: 2500 });
    expect(state.section).toHaveBeenLastCalledWith(state.context);
  });

  it("stops the animation loop with reduced motion and repositions on resize", () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      ...matchMedia(query),
      matches: query === "(prefers-reduced-motion: reduce)" || query === "(pointer: fine)",
    }));
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });
    render(<AstroBuddy />);
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Soltar astronauta"));
    const flushFrame = () =>
      act(() => {
        const callbacks = [...frames.values()];
        frames.clear();
        callbacks.forEach((callback) => callback(16));
      });
    expect(frames.size).toBeGreaterThan(0);
    flushFrame();
    expect(frames.size).toBe(0);
    fireEvent(window, new Event("resize"));
    expect(frames.size).toBe(1);
    flushFrame();
    expect(frames.size).toBe(0);
  });

  it("keeps the reader's position when a reply arrives and offers return to latest", async () => {
    let resolve!: (value: { message: string }) => void;
    state.chat.mockReturnValue(
      new Promise((reply) => {
        resolve = reply;
      }),
    );
    show();
    const input = screen.getByLabelText("Mensagem para o astronauta");
    fireEvent.change(input, { target: { value: "Quais territórios existem?" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(state.chat).toHaveBeenCalledOnce());
    const log = screen.getByRole("log");
    Object.defineProperties(log, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
    });
    const scroll = vi.fn();
    log.scrollTo = scroll;
    fireEvent.scroll(log, { target: { scrollTop: 0 } });
    fireEvent(window, new Event("resize"));
    expect(scroll).not.toHaveBeenCalled();
    await act(async () => {
      resolve({ message: "Resposta enquanto você lia o histórico." });
    });
    expect(scroll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ir para o fim da conversa" }));
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", top: 1000 });
    fireEvent(window, new Event("resize"));
    expect(scroll).toHaveBeenLastCalledWith({ behavior: "instant", top: 1000 });
    expect(
      screen.queryByRole("button", { name: "Ir para o fim da conversa" }),
    ).not.toBeInTheDocument();
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      ...matchMedia(query),
      matches: query === "(prefers-reduced-motion: reduce)",
    }));
    fireEvent.scroll(log, { target: { scrollTop: 0 } });
    fireEvent.click(screen.getByRole("button", { name: "Ir para o fim da conversa" }));
    expect(scroll).toHaveBeenLastCalledWith({ behavior: "instant", top: 1000 });
  });

  it("returns keyboard focus to the ship after closing the conversation", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Fechar conversa" }));
    await waitFor(() => expect(screen.getByLabelText("Abrir opções da nave")).toHaveFocus());
  });

  it("resizes a multiline draft when the conversation is mounted again", () => {
    vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockImplementation(function (
      this: HTMLTextAreaElement,
    ) {
      return this.value.split("\n").length * 20 + 24;
    });
    show();
    fireEvent.change(screen.getByLabelText("Mensagem para o astronauta"), {
      target: { value: "Primeira linha\nSegunda linha\nTerceira linha" },
    });
    expect(screen.getByLabelText("Mensagem para o astronauta")).toHaveStyle({ height: "84px" });
    fireEvent.click(screen.getByRole("button", { name: "Fechar conversa" }));
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Conversar com o astronauta"));
    expect(screen.getByLabelText("Mensagem para o astronauta")).toHaveStyle({ height: "84px" });
  });

  it("fills a suggestion without sending and supports Enter and Shift+Enter", async () => {
    show();
    fireEvent.click(screen.getByText("Como posso explorar Marte?"));
    const input = screen.getByLabelText("Mensagem para o astronauta");
    expect(input).toHaveValue("Como posso explorar Marte?");
    expect(input).toHaveFocus();
    expect(state.chat).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(state.chat).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(state.chat).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("Vamos explorar Valles!")).toBeInTheDocument();
  });

  it("preserves messages and drafts when closing and reopening the ship", async () => {
    show();
    fireEvent.change(screen.getByLabelText("Mensagem para o astronauta"), {
      target: { value: "Oi" },
    });
    fireEvent.keyDown(screen.getByLabelText("Mensagem para o astronauta"), { key: "Enter" });
    await screen.findByText("Vamos explorar Valles!");
    fireEvent.change(screen.getByLabelText("Mensagem para o astronauta"), {
      target: { value: "Minha próxima pergunta" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fechar conversa" }));
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Conversar com o astronauta"));
    expect(screen.getByText("Vamos explorar Valles!")).toBeInTheDocument();
    expect(screen.getByLabelText("Mensagem para o astronauta")).toHaveValue(
      "Minha próxima pergunta",
    );
  });

  it("clears the previous account's conversation on sign out", async () => {
    const view = render(<AstroBuddy />);
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Conversar com o astronauta"));
    fireEvent.change(screen.getByLabelText("Mensagem para o astronauta"), {
      target: { value: "Oi" },
    });
    fireEvent.keyDown(screen.getByLabelText("Mensagem para o astronauta"), { key: "Enter" });
    await screen.findByText("Vamos explorar Valles!");
    state.user = { id: "visitor", guest: true };
    view.rerender(<AstroBuddy />);
    expect(screen.queryByText("Vamos explorar Valles!")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Enviar mensagem")).toBeDisabled();
  });

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

  it("explains the point while AI is pending and ignores a response for the previous context", async () => {
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
        expect(screen.getByLabelText("Fala do astronauta")).toHaveTextContent("Valles Marineris:"),
      { timeout: 2500 },
    );
    state.context = { section: "territorios", element_id: "jezero-j021" };
    view.rerender(<AstroBuddy />);
    await act(async () => {
      resolve({ message: "Resposta antiga de Valles" });
    });
    expect(screen.queryByText("Resposta antiga de Valles")).not.toBeInTheDocument();
  });

  it("keeps a specific catalog explanation when the contextual AI request fails", async () => {
    state.context = { section: "viagens", element_id: "horizonte-valles" };
    state.section.mockRejectedValue(new Error("Serviço indisponível"));
    render(<AstroBuddy />);
    fireEvent.click(screen.getByLabelText("Abrir opções da nave"));
    fireEvent.click(screen.getByText("Soltar astronauta"));
    await waitFor(() => expect(state.section).toHaveBeenCalledOnce(), { timeout: 2500 });
    expect(screen.getByLabelText("Fala do astronauta")).toHaveTextContent("Horizonte de Valles:");
    expect(screen.getByLabelText("Fala do astronauta")).toHaveTextContent(
      "acampamentos pressurizados",
    );
    expect(screen.queryByText(/Meu rádio está sem sinal/)).not.toBeInTheDocument();
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
    expect(state.chat).toHaveBeenCalledWith(
      "Oi",
      [],
      {
        section: "territorios",
        element_id: "valles-07",
      },
      null,
    );
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
