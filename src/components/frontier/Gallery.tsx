import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TERRITORIES, type Territory } from "@/data/territories";
import { cn } from "@/lib/utils";

/**
 * Expandable gallery of the six Martian landscapes.
 * Thumbnails open a fullscreen lightbox with prev/next navigation,
 * keyboard support (arrows + Esc) and the artistic-imagery disclaimer.
 */
export function Gallery() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null;

  const step = useCallback((delta: number) => {
    setOpenIndex((i) => (i === null ? null : (i + delta + TERRITORIES.length) % TERRITORIES.length));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const t = openIndex !== null ? TERRITORIES[openIndex] : undefined;

  return (
    <section id="galeria" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="eyebrow">Módulo 03 · Galeria</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Paisagens da fronteira</h2>
          <p className="max-w-sm text-muted-foreground">
            Abra qualquer paisagem em tela cheia e navegue entre os seis territórios.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {TERRITORIES.map((territory, i) => (
            <GalleryThumb key={territory.id} t={territory} index={i} onOpen={() => setOpenIndex(i)} />
          ))}
        </ul>

        <p className="mt-6 font-mono text-[10px] text-muted-foreground/70">
          Todas as imagens são representações artísticas originais geradas por IA para Ares Frontier — não são fotografias científicas.
        </p>
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setOpenIndex(null)}>
        {t && (
          <DialogContent
            data-ai-section="territorios"
            data-ai-element={t.id}
            className="fixed inset-0 left-0 top-0 z-50 flex max-h-screen max-w-none translate-x-0 translate-y-0 flex-col items-center justify-center gap-4 overflow-hidden border-0 bg-background/95 p-4 sm:rounded-none md:p-8"
          >
            <div className="sr-only">
              <DialogTitle>{t.region} — {t.lot}</DialogTitle>
              <DialogDescription>{t.imageAlt}</DialogDescription>
            </div>

            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
              <img
                key={t.id}
                src={t.image}
                alt={t.imageAlt}
                className="max-h-full max-w-full animate-rise rounded-sm object-contain"
                decoding="async"
              />
            </div>

            <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-mineral">{t.lot}</p>
                <p className="font-display text-xl font-semibold">{t.region}</p>
                <p className="mt-1 max-w-xl text-xs text-muted-foreground">{t.imageSource}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs tabular-nums text-muted-foreground" aria-live="polite">
                  {String((openIndex ?? 0) + 1).padStart(2, "0")} / {String(TERRITORIES.length).padStart(2, "0")}
                </span>
                <Button size="sm" variant="outline" onClick={() => step(-1)} aria-label="Paisagem anterior">
                  <ChevronLeft />
                </Button>
                <Button size="sm" variant="outline" onClick={() => step(1)} aria-label="Próxima paisagem">
                  <ChevronRight />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpenIndex(null)} aria-label="Fechar galeria">
                  <X /> Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}

function GalleryThumb({ t, index, onOpen }: { t: Territory; index: number; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <li>
      <button
        type="button"
        data-ai-section="territorios"
        data-ai-element={t.id}
        onClick={onOpen}
        aria-label={`Abrir ${t.region} em tela cheia`}
        className="group relative block w-full overflow-hidden border border-border transition-colors hover:border-mineral/70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-ring"
      >
        <img
          src={t.image}
          alt={t.imageAlt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            "aspect-[4/3] w-full object-cover object-center transition-all duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/85 to-transparent" />
        <span className="absolute left-3 top-3 font-mono text-[10px] text-foreground/80">{String(index + 1).padStart(2, "0")}</span>
        <span className="absolute bottom-3 left-3 font-display text-base font-semibold drop-shadow">
          {t.region}
        </span>
        <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/70 backdrop-blur transition-colors group-hover:border-mineral">
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      </button>
    </li>
  );
}
