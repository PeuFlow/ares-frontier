import { Link } from "@tanstack/react-router";
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
          <nav className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground" aria-label="Rodapé">
            <Link to="/viagens" className="hover:text-foreground">Viagens</Link>
            <Link to="/hospedagens" className="hover:text-foreground">Hospedagens</Link>
            <Link to="/territorios" className="hover:text-foreground">Territórios</Link>
            <Link to="/missao" className="hover:text-foreground">Minha missão</Link>
          </nav>
        </div>
        <div className="mt-12 border border-border p-5">
          <p className="eyebrow !text-mineral">Demonstração conceitual · Experiência fictícia</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            A Ares Frontier é um projeto conceitual. Os terrenos, preços, reservas e indicadores comerciais apresentados são fictícios e não representam propriedade legal sobre áreas em Marte nem uma oferta real de compra. Viagens, hospedagens, experiências e reservas são simulações sem contratação, pagamento ou autenticação segura.
          </p>
        </div>
        <p className="mt-6 font-mono text-[10px] text-muted-foreground/70">© 2089 ARES FRONTIER — PROTÓTIPO FASE 2</p>
      </div>
    </footer>
  );
}
