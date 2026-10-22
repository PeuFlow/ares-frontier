import { Orbit, ScanLine, Stamp } from "lucide-react";

const STEPS = [
  { n: "01", t: "Explore", d: "Inspecione o planeta e descubra regiões disponíveis.", I: Orbit },
  { n: "02", t: "Analise", d: "Compare os atributos demonstrativos dos terrenos para encontrar o perfil adequado à sua missão.", I: ScanLine },
  { n: "03", t: "Reserve", d: "Simule a reserva do território escolhido e receba um certificado demonstrativo.", I: Stamp },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="tech-grid scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Módulo 03 · Protocolo</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Como funciona</h2>
          <p className="mt-5 max-w-sm text-muted-foreground">Três etapas, do primeiro olhar orbital à confirmação demonstrativa de reserva.</p>
        </div>
        <ol>
          {STEPS.map(({ n, t, d, I }, i) => (
            <li key={n} className={`grid grid-cols-[auto_1fr] gap-6 border-t border-border py-10 md:gap-10 ${i === 1 ? "md:pl-16" : i === 2 ? "md:pl-32" : ""}`}>
              <span className="font-mono text-6xl font-light tabular-nums text-primary/80 md:text-8xl">{n}</span>
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <I className="h-4 w-4 text-mineral" />
                  <h3 className="font-mono text-sm uppercase tracking-[0.3em]">{t}</h3>
                </div>
                <p className="mt-3 max-w-md text-lg leading-relaxed text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
