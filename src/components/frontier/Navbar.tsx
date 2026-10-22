import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "#explorar", label: "Explorar Marte" },
  { href: "#terrenos", label: "Terrenos" },
  { href: "#como-funciona", label: "Como funciona" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8" aria-label="Principal">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
          <Button asChild size="sm">
            <a href="#explorar">Explorar agora</a>
          </Button>
        </div>
        <button className="p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-border bg-background px-5 py-4 md:hidden">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block py-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {l.label}
            </a>
          ))}
          <Button asChild className="mt-3 w-full">
            <a href="#explorar" onClick={() => setOpen(false)}>Explorar agora</a>
          </Button>
        </div>
      )}
    </header>
  );
}
