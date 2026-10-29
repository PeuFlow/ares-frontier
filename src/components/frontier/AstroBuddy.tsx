import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

type Mood = "idle" | "happy" | "wow" | "think";

const SECTION_LINES: Record<string, [string, Mood]> = {
  top: ["Bem-vindo a Marte!", "happy"],
  explorar: ["Gire o planeta comigo!", "wow"],
  terrenos: ["Qual lote vai ser o seu?", "think"],
  "como-funciona": ["É simples, eu explico!", "happy"],
};
const ROUTE_LINES: Record<string, [string, Mood]> = {
  "/viagens": ["Partiu decolagem! 🚀", "wow"],
  "/hospedagens": ["Bom lugar pra dormir…", "happy"],
  "/experiencias": ["Isso vai ser épico!", "wow"],
  "/missao": ["Revisando a missão!", "think"],
  "/conta": ["Seu painel, comandante.", "happy"],
  "/territorios": ["Terreno à vista!", "think"],
};

function reactTo(el: HTMLElement, path: string): [string, Mood] {
  if (el.closest("canvas")) return ["Uau, que vista!", "wow"];
  const btn = el.closest("button, a");
  const label = (btn?.getAttribute("aria-label") || btn?.textContent || "").toLowerCase();
  if (label.includes("favorit")) return ["Guardei nos favoritos! ♥", "happy"];
  if (label.includes("compar")) return ["Hmm, vamos comparar…", "think"];
  if (label.includes("reserv") || label.includes("missão") || label.includes("missao")) return ["Missão atualizada!", "happy"];
  if (label.includes("detalhe")) return ["Deixa eu ver de perto…", "think"];
  if (el.closest("input, textarea, select, [role=combobox]")) return ["Pode digitar, eu espero.", "think"];
  const sec = el.closest("section[id]")?.id;
  if (sec && SECTION_LINES[sec]) return SECTION_LINES[sec];
  if (ROUTE_LINES[path]) return ROUTE_LINES[path];
  return btn ? ["Boa escolha!", "happy"] : ["Explorando…", "idle"];
}

export function AstroBuddy() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>("idle");
  const [flip, setFlip] = useState(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    setEnabled(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: window.innerWidth - 120, y: window.innerHeight - 140 };
    const pos = { ...target };
    let raf = 0;
    let lastX = pos.x;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onMove = (e: PointerEvent) => { target.x = e.clientX + 22; target.y = e.clientY + 18; };
    const onDown = (e: PointerEvent) => {
      const [m, md] = reactTo(e.target as HTMLElement, pathRef.current);
      setMsg(m); setMood(md);
      clearTimeout(timer);
      timer = setTimeout(() => { setMsg(null); setMood("idle"); }, 2200);
    };
    const tick = (t: number) => {
      const k = reduced ? 1 : 0.12;
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      const bob = reduced ? 0 : Math.sin(t / 400) * 4;
      const tilt = reduced ? 0 : Math.max(-20, Math.min(20, (pos.x - lastX) * 1.5));
      if (Math.abs(pos.x - lastX) > 0.6) setFlip(pos.x < lastX);
      lastX = pos.x;
      if (ref.current) ref.current.style.transform = `translate3d(${pos.x}px, ${pos.y + bob}px, 0) rotate(${tilt}deg)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [enabled]);

  if (!enabled) return null;
  const eyes = mood === "wow" ? "M22 26h0M30 26h0" : mood === "happy" ? "M20 27q2-3 4 0M28 27q2-3 4 0" : "M22 26h0M30 26h0";

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[60] will-change-transform">
      {msg && (
        <div key={msg} className="animate-rise absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-sm border border-border bg-card px-2 py-1 font-mono text-[10px] text-foreground shadow-lg">
          {msg}
        </div>
      )}
      <svg width="52" height="60" viewBox="0 0 52 60" style={{ transform: flip ? "scaleX(-1)" : undefined }}
        className={mood === "wow" ? "drop-shadow-[0_0_8px_var(--primary)]" : ""}>
        {/* backpack */}
        <rect x="8" y="30" width="36" height="20" rx="6" fill="var(--muted)" stroke="var(--border)" />
        {/* body */}
        <rect x="13" y="32" width="26" height="22" rx="8" fill="var(--foreground)" />
        <rect x="21" y="38" width="10" height="6" rx="1.5" fill="var(--primary)" />
        {/* arms */}
        <rect x="6" y={mood === "happy" ? 26 : 36} width="8" height="12" rx="4" fill="var(--foreground)" transform={mood === "happy" ? "rotate(-30 10 32)" : undefined} />
        <rect x="38" y="36" width="8" height="12" rx="4" fill="var(--foreground)" />
        {/* legs */}
        <rect x="16" y="50" width="8" height="9" rx="3" fill="var(--foreground)" />
        <rect x="28" y="50" width="8" height="9" rx="3" fill="var(--foreground)" />
        {/* helmet */}
        <circle cx="26" cy="22" r="17" fill="var(--foreground)" />
        <rect x="13" y="14" width="26" height="18" rx="9" fill="var(--background)" />
        <path d={eyes} stroke="var(--mineral)" strokeWidth={mood === "wow" ? 4 : 2.2} strokeLinecap="round" fill="none" />
        {mood === "think" && <path d="M23 30h6" stroke="var(--mineral)" strokeWidth="1.6" strokeLinecap="round" />}
        <path d="M17 17q3-3 7-3" stroke="var(--muted-foreground)" strokeWidth="1.5" fill="none" opacity=".6" />
        <line x1="26" y1="5" x2="26" y2="0" stroke="var(--border)" strokeWidth="1.5" />
        <circle cx="26" cy="1" r="1.8" fill="var(--primary)" />
      </svg>
    </div>
  );
}
