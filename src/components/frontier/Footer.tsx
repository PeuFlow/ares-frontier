import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border pb-28 pt-16">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div>
            <div className="flex items-center gap-3">
              <LogoMark />
              <span className="font-display text-sm font-semibold tracking-[0.24em]">ARES FRONTIER</span>
            </div>
            <p className="mt-4 font-display text-2xl">O futuro começa em novas fronteiras.</p>
          </div>
          <nav className="flex gap-8 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground" aria-label="Rodapé">
            <a href="#explorar" className="hover:text-foreground">Exploração</a>
            <a href="#terrenos" className="hover:text-foreground">Terrenos</a>
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
          </nav>
        </div>
        <div className="mt-12 border border-border p-5">
          <p className="eyebrow !text-mineral">Demonstração conceitual · Experiência fictícia</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            A Ares Frontier é um projeto conceitual. Os terrenos, preços, reservas e indicadores comerciais apresentados são fictícios e não representam propriedade legal sobre áreas em Marte nem uma oferta real de compra.
          </p>
        </div>
        <p className="mt-6 font-mono text-[10px] text-muted-foreground/70">© 2089 ARES FRONTIER — PROTÓTIPO FASE 1</p>
      </div>
    </footer>
  );
}
