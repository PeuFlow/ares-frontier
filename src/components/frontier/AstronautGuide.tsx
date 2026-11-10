import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exploring: boolean;
  renderExplorer: (speech: ExplorerSpeech) => ReactNode;
}) {
  const context = useAstronautContext();
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
  const seen = useRef(new Set<string>());
  const request = useRef(false);
  const contextRequest = useRef<Promise<unknown> | null>(null);
  const generation = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const closeBubble = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    generation.current++;
    request.current = false;
    setMessages([]);
    setInput("");
    setError("");
    setBusy(false);
    setBubble("");
    seen.current.clear();
  }, [account]);

  useEffect(() => {
    setBubble("");
    setDismissed(false);
    clearTimeout(closeBubble.current);
    if (!account || !exploring || muted || open || seen.current.has(contextKey)) return;
    let active = true;
    // Debounce scrolling and selections before spending a model request.
    const timer = setTimeout(async () => {
      await contextRequest.current;
      if (!active) return;
      setContextBusy(true);
      setBubble("");
      contextRequest.current = sectionContext(JSON.parse(contextKey))
        .then((reply) => {
          if (!active) return;
          seen.current.add(contextKey);
          setBubble(reply.message);
          clearTimeout(closeBubble.current);
          closeBubble.current = setTimeout(() => setBubble(""), 14000);
        })
        .catch(() => {
          if (active) {
            setBubble("Meu rádio está sem sinal. Você pode tentar conversar comigo na nave.");
            closeBubble.current = setTimeout(() => setBubble(""), 8000);
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
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, busy]);

  const reset = () => {
    generation.current++;
    request.current = false;
    setMessages([]);
    setInput("");
    setError("");
    setBusy(false);
  };
  const changeOpen = (value: boolean) => {
    onOpenChange(value);
    setBubble("");
    if (!value) reset();
  };
  const send = async () => {
    const text = input.trim();
    if (!text || text.length > 2000 || request.current || !account) return;
    request.current = true;
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
        thinking: contextBusy && !dismissed,
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
        <DialogContent className="flex h-[min(42rem,90dvh)] max-w-xl flex-col gap-0 overflow-hidden rounded-sm border-mineral/40 bg-card p-0">
          <DialogHeader className="shrink-0 border-b border-border p-5 text-left">
            <p className="eyebrow">Ares Frontier · comunicação da nave</p>
            <DialogTitle className="flex items-center gap-3 font-display text-2xl">
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
            <DialogDescription>Seu companheiro para explorar Marte.</DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-2">
            <button className="font-mono text-[11px] text-mineral" onClick={reset}>
              Nova conversa
            </button>
            <button
              className="font-mono text-[11px] text-muted-foreground"
              onClick={() => setMuted((v) => !v)}
            >
              {muted ? "Ativar explicações" : "Pausar explicações"}
            </button>
          </div>
          <div
            role="log"
            aria-label="Conversa com o astronauta"
            aria-live="polite"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5"
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
                <div className="py-6 text-sm leading-relaxed text-muted-foreground">
                  <p className="text-foreground">
                    Fala, explorador! Pronto para descobrir a fronteira?
                  </p>
                  <p className="mt-2">
                    Posso explicar os territórios, comparar habitats ou ajudar a planejar uma
                    missão.
                  </p>
                  <button
                    className="mt-4 rounded-sm border border-border p-3 text-left hover:border-mineral"
                    onClick={() => setInput("Quero conhecer Marte. Por onde começo?")}
                  >
                    Por onde começo minha exploração?
                  </button>
                </div>
              )
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[90%] whitespace-pre-wrap break-words rounded-sm border p-3 text-sm leading-relaxed ${m.role === "user" ? "ml-auto border-mineral/30 bg-mineral/10" : "border-border bg-background"}`}
              >
                <span className="mb-1 block font-mono text-[10px] uppercase text-muted-foreground">
                  {m.role === "user" ? "Você" : "Astronauta"}
                </span>
                {m.role === "assistant" ? <AstronautText text={m.content} /> : m.content}
              </div>
            ))}
            {busy && (
              <p role="status" className="animate-pulse font-mono text-xs text-mineral">
                Astronauta consultando o diário de bordo…
              </p>
            )}
            <div ref={bottom} />
          </div>
          <form
            className="shrink-0 border-t border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {error && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="astronaut-message">
                Mensagem para o astronauta
              </label>
              <input
                id="astronaut-message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                disabled={busy || !account}
                placeholder="Qual será nossa próxima descoberta?"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-sm border border-border bg-background px-3 py-3 text-sm focus:outline-mineral disabled:opacity-50"
              />
              <Button
                type="submit"
                aria-label="Enviar mensagem"
                disabled={busy || !account || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Conversa temporária · mensagens enviadas ao Google Gemini · evite dados sensíveis.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
