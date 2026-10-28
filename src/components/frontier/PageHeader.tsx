import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children, image }: { eyebrow: string; title: string; children?: ReactNode; image?: string }) {
  return (
    <section className="relative overflow-hidden border-b border-border pb-14 pt-32">
      {image && (
        <>
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        </>
      )}
      <div className="tech-grid absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <p className="eyebrow animate-rise">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl animate-rise font-display text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
        {children && <div className="mt-5 max-w-2xl animate-rise text-muted-foreground">{children}</div>}
      </div>
    </section>
  );
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="border border-mineral/40 bg-mineral/5 px-4 py-3 font-mono text-[11px] text-muted-foreground">
      <span className="text-mineral">DEMONSTRAÇÃO CONCEITUAL · </span>
      {children ?? "Serviços fictícios. Nenhuma contratação, pagamento ou reserva real é realizada."}
    </p>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`h-10 border px-3 font-mono text-[10px] uppercase tracking-wider transition-colors ${active ? "border-mineral text-mineral" : "border-border text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}
