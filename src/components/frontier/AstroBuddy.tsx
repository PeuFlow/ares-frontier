import { useEffect, useRef, useState, type RefObject } from "react";
import { AstronautGuide, type ExplorerSpeech } from "./AstronautGuide";
import { AstronautText } from "./AstronautText";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageCircle, UserRound, X } from "lucide-react";

type Mood = "idle" | "happy" | "wow" | "think";

export function AstroBuddy() {
  const [chatOpen, setChatOpen] = useState(false);
  const [out, setOut] = useState(false);
  const rocketRef = useRef<HTMLButtonElement>(null);
  return (
    <AstronautGuide
      open={chatOpen}
      onOpenChange={setChatOpen}
      exploring={out}
      returnFocusRef={rocketRef}
      renderExplorer={(speech) => (
        <MiniAstronaut
          out={out}
          setOut={setOut}
          speech={speech}
          rocketRef={rocketRef}
          onChat={() => {
            setOut(false);
            setChatOpen(true);
          }}
        />
      )}
    />
  );
}

function MiniAstronaut({
  out,
  setOut,
  onChat,
  speech,
  rocketRef,
}: {
  out: boolean;
  setOut: (value: boolean) => void;
  onChat: () => void;
  speech: ExplorerSpeech;
  rocketRef: RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const speechRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const reposition = useRef<() => void>(() => {});
  const [msg, setMsg] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [flip, setFlip] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;
  const [bye, setBye] = useState(false);

  useEffect(() => {
    const pointer = window.matchMedia("(pointer: fine)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setEnabled(pointer.matches);
      setReducedMotion(motion.matches);
    };
    update();
    pointer.addEventListener("change", update);
    motion.addEventListener("change", update);
    return () => {
      pointer.removeEventListener("change", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!out) return;
    const reduced = reducedMotion || !enabled;
    const r0 = rocketRef.current?.getBoundingClientRect();
    const home = r0
      ? { x: r0.left + r0.width / 2 - 26, y: r0.top - 30 }
      : { x: 40, y: window.innerHeight - 120 };
    const target = { ...home };
    const pos = { ...home };
    let armed = false;
    let leaving = false;
    setMsg("Partiu exploração!");
    setMood("wow");
    let raf = 0;
    let lastX = pos.x;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMove = (e: PointerEvent) => {
      if (
        leaving ||
        reduced ||
        menuOpenRef.current ||
        speechRef.current ||
        (e.target instanceof Element && e.target.closest("[data-astronaut-speech]"))
      )
        return;
      target.x = e.clientX + 22;
      target.y = e.clientY + 18;
      const r = rocketRef.current?.getBoundingClientRect();
      if (!r) return;
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      if (d > 120) armed = true;
      else if (armed && d < 50) {
        leaving = true;
        target.x = r.left + r.width / 2 - 26;
        target.y = r.top;
        clearTimeout(timer);
        setMsg("Até a próxima, comandante! 👋");
        setMood("happy");
        timer = setTimeout(() => {
          setMsg(null);
          setMood("idle");
          setOut(false);
          setBye(true);
          setTimeout(() => setBye(false), 1600);
        }, 1300);
      }
    };
    const tick = (t: number) => {
      raf = 0;
      const k = reduced ? 1 : 0.12;
      pos.x = Math.max(8, Math.min(pos.x + (target.x - pos.x) * k, window.innerWidth - 60));
      pos.y = Math.max(8, Math.min(pos.y + (target.y - pos.y) * k, window.innerHeight - 72));
      const bob = reduced ? 0 : Math.sin(t / 400) * 4;
      const tilt = reduced ? 0 : Math.max(-20, Math.min(20, (pos.x - lastX) * 1.5));
      if (Math.abs(pos.x - lastX) > 0.6) setFlip(pos.x < lastX);
      lastX = pos.x;
      if (ref.current) ref.current.style.transform = `translate3d(${pos.x}px, ${pos.y + bob}px, 0)`;
      if (bodyRef.current) bodyRef.current.style.transform = `rotate(${tilt}deg)`;
      if (speechRef.current) {
        const { offsetWidth: width, offsetHeight: height } = speechRef.current;
        const x = Math.max(12, Math.min(pos.x + 26 - width / 2, window.innerWidth - width - 12));
        const preferredY = pos.y > height + 24 ? pos.y - height - 12 : pos.y + 70;
        const y = Math.max(12, Math.min(preferredY, window.innerHeight - height - 12));
        speechRef.current.style.left = `${x - pos.x}px`;
        speechRef.current.style.top = `${y - pos.y - bob}px`;
      }
      if (!reduced) raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    reposition.current = schedule;
    schedule();
    window.addEventListener("resize", schedule);
    timer = setTimeout(() => {
      setMsg(null);
      setMood("idle");
    }, 1600);
    if (enabled) window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      reposition.current = () => {};
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onMove);
    };
  }, [enabled, out, setOut, reducedMotion, rocketRef]);

  const rocket = (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          ref={rocketRef}
          type="button"
          aria-label="Abrir opções da nave"
          title="Nave do explorador"
          className="group fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card/90 backdrop-blur transition-transform hover:scale-110"
        >
          <svg width="30" height="30" viewBox="0 0 32 32" className={out ? "opacity-60" : ""}>
            <path d="M16 2c5 4 7 10 6 18H10C9 12 11 6 16 2z" fill="var(--foreground)" />
            <circle
              cx="16"
              cy="12"
              r="3"
              fill={out ? "var(--background)" : "var(--mineral)"}
              stroke="var(--border)"
            />
            <path d="M10 16l-4 6h5zM22 16l4 6h-5z" fill="var(--primary)" />
            <path d="M13 22h6l-3 7z" fill="var(--mineral)" />
          </svg>
          {!out && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-mineral" />}
          {bye && (
            <span className="animate-rise absolute bottom-full left-0 mb-2 whitespace-nowrap rounded-sm border border-border bg-card px-2 py-1 font-mono text-[10px] text-foreground">
              Astronauta a bordo 🚀
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="z-[61] w-64 rounded-sm border-border bg-card p-2"
      >
        <p className="eyebrow px-3 py-2">Nave do explorador</p>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm hover:bg-muted focus-visible:bg-muted"
          onClick={() => {
            setOut(!out);
            setMenuOpen(false);
          }}
        >
          <UserRound className="h-4 w-4 text-mineral" />
          {out ? "Recolher astronauta" : "Soltar astronauta"}
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-sm px-3 py-3 text-left text-sm hover:bg-muted focus-visible:bg-muted"
          onClick={() => {
            setMenuOpen(false);
            onChat();
          }}
        >
          <MessageCircle className="h-4 w-4 text-mineral" />
          Conversar com o astronauta
        </button>
        {out && (
          <button
            type="button"
            className="w-full rounded-sm px-3 py-2 text-left font-mono text-[10px] text-muted-foreground hover:bg-muted"
            onClick={() => {
              speech.togglePaused();
              setMenuOpen(false);
            }}
          >
            {speech.paused ? "Ativar explicações" : "Pausar explicações"}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
  const thinking = speech.thinking && !speech.paused;
  const spoken = msg?.startsWith("Até")
    ? msg
    : thinking
      ? "Consultando o diário de bordo…"
      : speech.message || msg;
  const expression = thinking ? "think" : speech.message ? "happy" : mood;
  useEffect(() => {
    reposition.current();
    const balloon = speechRef.current;
    if (!balloon || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => reposition.current());
    observer.observe(balloon);
    return () => observer.disconnect();
  }, [spoken]);
  const eyes =
    expression === "wow"
      ? "M22 26h0M30 26h0"
      : expression === "happy"
        ? "M20 27q2-3 4 0M28 27q2-3 4 0"
        : "M22 26h0M30 26h0";

  return (
    <>
      {rocket}
      {out && (
        <div
          ref={ref}
          className="pointer-events-none fixed left-0 top-0 z-[45] will-change-transform"
        >
          {spoken && (
            <div
              ref={speechRef}
              data-astronaut-speech
              aria-label="Fala do astronauta"
              className="astronaut-message pointer-events-auto absolute left-0 top-[-160px] w-[min(20rem,calc(100vw-24px))] max-h-[min(20rem,45dvh)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground shadow-lg"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] text-mineral">
                  Astronauta · {thinking ? "pensando" : "explorando"}
                </span>
                <button
                  type="button"
                  aria-label="Fechar explicação"
                  className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                  onClick={() => {
                    speech.dismiss();
                    setMsg(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div role="status" aria-live="polite">
                <AstronautText text={spoken} />
              </div>
              <button
                type="button"
                className="mt-2 min-h-11 rounded-lg px-2 text-xs text-mineral hover:bg-muted"
                onClick={speech.togglePaused}
              >
                {speech.paused ? "Ativar explicações" : "Pausar explicações"}
              </button>
            </div>
          )}
          <div ref={bodyRef}>
            <svg
              aria-hidden="true"
              width="52"
              height="60"
              viewBox="0 0 52 60"
              style={{ transform: flip ? "scaleX(-1)" : undefined }}
              className={expression === "wow" ? "drop-shadow-[0_0_8px_var(--primary)]" : ""}
            >
              {/* backpack */}
              <rect
                x="8"
                y="30"
                width="36"
                height="20"
                rx="6"
                fill="var(--muted)"
                stroke="var(--border)"
              />
              {/* body */}
              <rect x="13" y="32" width="26" height="22" rx="8" fill="var(--foreground)" />
              <rect x="21" y="38" width="10" height="6" rx="1.5" fill="var(--primary)" />
              {/* arms */}
              <rect
                x="6"
                y={expression === "happy" ? 26 : 36}
                width="8"
                height="12"
                rx="4"
                fill="var(--foreground)"
                transform={expression === "happy" ? "rotate(-30 10 32)" : undefined}
              />
              <rect x="38" y="36" width="8" height="12" rx="4" fill="var(--foreground)" />
              {/* legs */}
              <rect x="16" y="50" width="8" height="9" rx="3" fill="var(--foreground)" />
              <rect x="28" y="50" width="8" height="9" rx="3" fill="var(--foreground)" />
              {/* helmet */}
              <circle cx="26" cy="22" r="17" fill="var(--foreground)" />
              <rect x="13" y="14" width="26" height="18" rx="9" fill="var(--background)" />
              <path
                d={eyes}
                stroke="var(--mineral)"
                strokeWidth={expression === "wow" ? 4 : 2.2}
                strokeLinecap="round"
                fill="none"
              />
              {expression === "think" && (
                <path
                  d="M23 30h6"
                  stroke="var(--mineral)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
              <path
                d="M17 17q3-3 7-3"
                stroke="var(--muted-foreground)"
                strokeWidth="1.5"
                fill="none"
                opacity=".6"
              />
              <line x1="26" y1="5" x2="26" y2="0" stroke="var(--border)" strokeWidth="1.5" />
              <circle cx="26" cy="1" r="1.8" fill="var(--primary)" />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
