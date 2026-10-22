export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <circle cx="16" cy="16" r="6" className="fill-primary" />
      <ellipse cx="16" cy="16" rx="14" ry="6" transform="rotate(-28 16 16)" className="stroke-foreground/60" strokeWidth="1" />
      <circle cx="27.5" cy="10" r="1.6" className="fill-mineral" />
    </svg>
  );
}

export function Logo() {
  return (
    <a href="#top" className="flex items-center gap-3" aria-label="Ares Frontier — início">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-sm font-semibold tracking-[0.24em]">ARES FRONTIER</span>
        <span className="mt-1 font-mono text-[9px] tracking-[0.3em] text-muted-foreground">MARS TERRITORY EXCHANGE</span>
      </span>
    </a>
  );
}
