import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, RotateCcw, Send, Radio } from "lucide-react";
import { AstronautText } from "./AstronautText";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMission } from "@/hooks/use-mission";
import { useAstronautContext } from "@/hooks/use-astronaut-context";
import { astronautChat, sectionContext, type AIMessage } from "@/lib/ai-api";
import { explainAstronautContext } from "@/lib/astronaut-context";

export interface ExplorerSpeech {
  message: string;
  thinking: boolean;
  paused: boolean;
  dismiss: () => void;
  togglePaused: () => void;
}

export function AstronautGuide({
  open,
  onOpenChange,
  exploring,
  renderExplorer,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exploring: boolean;
  renderExplorer: (speech: ExplorerSpeech) => ReactNode;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const context = useAstronautContext(exploring && !open);
  const contextKey = JSON.stringify(context);
  const { user } = useMission();
  const account = user?.guest ? null : user?.id;
  const [muted, setMuted] = useState(false);
  const [bubble, setBubble] = useState("");
  const [contextBusy, setContextBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(false);
  const contextRequest = useRef<Promise<unknown> | null>(null);
  const generation = useRef(0);
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const follow = useRef(true);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const closeBubble = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resizeComposer = useCallback((field: HTMLTextAreaElement | null) => {
    composer.current = field;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 144)}px`;
  }, []);

  useEffect(() => {
    generation.current++;
    request.current = false;
    setMessages([]);
    setInput("");
    setError("");
    setBusy(false);
    setBubble("");
  }, [account]);

  useEffect(() => {
    setBubble("");
    setDismissed(false);
    clearTimeout(closeBubble.current);
    if (!account || !exploring || muted || open) return;
    let active = true;
    // Debounce scrolling and selections before spending a model request.
    const timer = setTimeout(async () => {
      const currentContext = JSON.parse(contextKey);
      const description = explainAstronautContext(currentContext);
      setBubble(description);
      closeBubble.current = setTimeout(() => setBubble(""), 14000);
      await contextRequest.current;
      if (!active) return;
      setContextBusy(true);
      contextRequest.current = sectionContext(currentContext)
        .then((reply) => {
          if (!active) return;
          setBubble(reply.message);
          clearTimeout(closeBubble.current);
          closeBubble.current = setTimeout(() => setBubble(""), 14000);
        })
        .catch(() => {
          if (active) {
            if (!description) {
              setBubble("Meu rádio está sem sinal. Você pode tentar conversar comigo na nave.");
              closeBubble.current = setTimeout(() => setBubble(""), 8000);
            }
          }
        })
        .finally(() => {
          if (active) setContextBusy(false);
        });
    }, 1000);
    return () => {
      active = false;
      clearTimeout(timer);
      setContextBusy(false);
    };
  }, [account, contextKey, muted, open, exploring]);
  useEffect(
    () => () => {
      clearTimeout(closeBubble.current);
      generation.current++;
    },
    [],
  );
  const scrollToLatest = useCallback((animate = false) => {
    const area = log.current;
    if (!area) return;
    area.scrollTo?.({
      top: area.scrollHeight,
      behavior:
        !animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
    });
  }, []);
  useLayoutEffect(() => {
    if (open) {
      follow.current = true;
      setAwayFromBottom(false);
    }
  }, [open]);
  useLayoutEffect(() => {
    resizeComposer(composer.current);
  }, [input, resizeComposer]);
  useLayoutEffect(() => {
    if (open && follow.current) scrollToLatest();
  }, [messages, busy, open, input, scrollToLatest]);
  useEffect(() => {
    if (!open) return;
    const resize = () => {
      resizeComposer(composer.current);
      if (follow.current) scrollToLatest();
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [open, resizeComposer, scrollToLatest]);

  const reset = () => {
    generation.current++;
    request.current = false;
    setMessages([]);
    setInput("");
    setError("");
    setBusy(false);
    follow.current = true;
    setAwayFromBottom(false);
    composer.current?.focus();
  };
  const changeOpen = (value: boolean) => {
    onOpenChange(value);
    setBubble("");
    // Keep this account's conversation in memory while the ship is closed.
    // Signing out, changing accounts, or reloading still clears it.
    if (value) {
      follow.current = true;
      setAwayFromBottom(false);
    }
  };
  const send = async () => {
    const text = input.trim();
    if (!text || text.length > 2000 || request.current || !account) return;
    request.current = true;
    follow.current = true;
    setAwayFromBottom(false);
    const version = generation.current;
    const previous = messages;
    setMessages([...previous, { role: "user", content: text }]);
    setInput("");
    setError("");
    setBusy(true);
    try {
      await contextRequest.current;
      if (version !== generation.current) return;
      const reply = await astronautChat(text, previous, context);
      if (version === generation.current)
        setMessages(
          [
            ...previous,
            { role: "user", content: text },
            { role: "assistant", content: reply.message },
          ].slice(-40) as AIMessage[],
        );
    } catch (cause) {
      if (version === generation.current) {
        setMessages(previous);
        setInput(text);
        setError(
          cause instanceof Error ? cause.message : "O rádio está sem sinal. Tente novamente.",
        );
      }
    } finally {
      if (version === generation.current) {
        request.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <>
      {renderExplorer({
        message: dismissed
          ? ""
          : !account && exploring
            ? "Entre na sua conta para explorar comigo com a IA ligada."
            : bubble,
        thinking: contextBusy && !bubble && !dismissed,
        paused: muted,
        dismiss: () => {
          setBubble("");
          setDismissed(true);
        },
        togglePaused: () => {
          setMuted((v) => !v);
          setBubble("");
        },
      })}
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          closeLabel="Fechar conversa"
          onCloseAutoFocus={(event) => {
            if (returnFocusRef?.current) {
              event.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
          className="astronaut-chat flex h-[min(46rem,calc(100dvh-1.5rem))] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0"
        >
          <DialogHeader className="astronaut-header shrink-0 border-b border-border px-4 py-4 pr-14 text-left sm:px-6 sm:pr-16">
            <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
              ARES FRONTIER / CANAL DA NAVE
            </p>
            <DialogTitle className="flex items-center gap-3 font-display text-xl">
              <svg aria-hidden="true" width="40" height="44" viewBox="0 0 52 60">
                <rect x="13" y="32" width="26" height="22" rx="8" fill="var(--foreground)" />
                <rect x="21" y="38" width="10" height="6" rx="1.5" fill="var(--primary)" />
                <circle cx="26" cy="22" r="17" fill="var(--foreground)" />
                <rect x="13" y="14" width="26" height="18" rx="9" fill="var(--background)" />
                <path
                  d="M20 27q2-3 4 0M28 27q2-3 4 0"
                  stroke="var(--mineral)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              Astronauta a bordo
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${account ? "bg-mineral" : "bg-muted-foreground"}`}
              />
              {busy
                ? "Consultando o diário de bordo"
                : account
                  ? "Pronto para explorar"
                  : "Aguardando sua conexão"}
              <span aria-hidden="true">·</span> Assistente com IA
            </DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:px-5">
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-md px-2 text-xs text-mineral hover:bg-muted"
              onClick={reset}
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Nova conversa
            </button>
            <button
              type="button"
              aria-pressed={muted}
              className="min-h-11 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
              onClick={() => setMuted((v) => !v)}
            >
              {muted ? "Ativar explicações" : "Pausar explicações"}
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              ref={log}
              role="log"
              aria-label="Conversa com o astronauta"
              aria-live="polite"
              aria-relevant="additions text"
              onScroll={(event) => {
                const el = event.currentTarget;
                follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
                setAwayFromBottom(!follow.current);
              }}
              className="astronaut-log h-full min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
            >
              {!account ? (
                <p className="text-sm leading-relaxed">
                  Fala, explorador!{" "}
                  <Link
                    to="/login"
                    onClick={() => changeOpen(false)}
                    className="text-mineral underline"
                  >
                    Entre na sua conta
                  </Link>{" "}
                  para ligar o rádio e conversar comigo.
                </p>
              ) : (
                !messages.length && (
                  <div className="py-3 text-sm leading-relaxed text-muted-foreground sm:py-6">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-mineral/25 bg-mineral/10 text-mineral">
                      <Radio aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <p className="font-display text-lg text-foreground">
                      Fala, explorador! Pronto para descobrir a fronteira?
                    </p>
                    <p className="mt-2">
                      Posso explicar os territórios, comparar habitats ou ajudar a planejar uma
                      missão.
                    </p>
                    <p className="mb-3 mt-6 text-xs">Escolha um ponto de partida</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "Como posso explorar Marte?",
                        "Quais territórios você recomenda?",
                        "Como planejar uma missão?",
                        "Quero conhecer as hospedagens.",
                      ].map((question) => (
                        <button
                          key={question}
                          type="button"
                          className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-3 py-3 text-left text-xs text-foreground transition-colors hover:border-mineral/60 hover:bg-muted"
                          onClick={() => {
                            setInput(question);
                            composer.current?.focus();
                          }}
                        >
                          {question}
                          <ArrowUpRight
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-mineral"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`astronaut-message max-w-[94%] whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[88%] ${m.role === "user" ? "ml-auto rounded-br-sm border border-mineral/20 bg-mineral/10" : "rounded-bl-sm border border-border bg-background/60"}`}
                >
                  <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                    {m.role === "user" ? "Você" : "Astronauta"}
                  </span>
                  {m.role === "assistant" ? <AstronautText text={m.content} /> : m.content}
                </div>
              ))}
              {busy && (
                <p
                  role="status"
                  className="flex items-center gap-3 rounded-xl bg-background/60 p-4 text-xs text-mineral"
                >
                  <span aria-hidden="true" className="flex gap-1">
                    <i className="astronaut-dot" />
                    <i className="astronaut-dot" />
                    <i className="astronaut-dot" />
                  </span>
                  Astronauta consultando o diário de bordo…
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-mineral/30 bg-mineral/10 p-3 text-sm text-foreground"
                >
                  <strong className="block text-mineral">Não foi possível transmitir.</strong>
                  {error} Sua pergunta está no campo abaixo para tentar novamente.
                </p>
              )}
            </div>
            {awayFromBottom && (
              <button
                type="button"
                onClick={() => {
                  follow.current = true;
                  setAwayFromBottom(false);
                  scrollToLatest(true);
                }}
                className="absolute bottom-2 left-1/2 flex min-h-11 max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-background px-4 text-xs text-mineral shadow-lg"
              >
                <ArrowDown aria-hidden="true" className="h-4 w-4" />
                Ir para o fim da conversa
              </button>
            )}
          </div>
          <form
            className="astronaut-composer shrink-0 border-t border-border bg-background/30 p-3 sm:p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 focus-within:border-mineral">
              <label className="sr-only" htmlFor="astronaut-message">
                Mensagem para o astronauta
              </label>
              <textarea
                ref={resizeComposer}
                rows={1}
                id="astronaut-message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                disabled={!account}
                readOnly={busy}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Vamos explorar Marte?"
                autoComplete="off"
                className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-3 text-base leading-5 focus-visible:outline-none disabled:opacity-50 sm:text-sm"
              />
              <Button
                type="submit"
                aria-label="Enviar mensagem"
                className="h-11 w-11 shrink-0 rounded-lg"
                disabled={busy || !account || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="astronaut-help mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Enter envia · Shift + Enter cria uma linha. Conversa temporária com Google Gemini. A
              IA pode errar; evite dados sensíveis.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
