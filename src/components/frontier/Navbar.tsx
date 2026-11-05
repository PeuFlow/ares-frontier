import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, UserRound } from "lucide-react";
import { Logo } from "./Logo";
import { useMission } from "@/hooks/use-mission";

const LINKS = [
  { to: "/", label: "Explorar" },
  { to: "/viagens", label: "Viagens" },
  { to: "/hospedagens", label: "Hospedagens" },
  { to: "/experiencias", label: "Experiências" },
  { to: "/territorios", label: "Territórios" },
  { to: "/missao", label: "Minha missão" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { lines, user } = useMission();
  const count = lines.length;
  const cls = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground";
  const active = { className: "!text-mineral" };
  const label = (l: (typeof LINKS)[number]) => (
    <>
      {l.label}
      {l.to === "/missao" && count > 0 && <span className="ml-1.5 bg-primary px-1.5 py-0.5 text-[9px] text-primary-foreground">{count}</span>}
    </>
  );
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8" aria-label="Principal">
        <Logo />
        <div className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={cls} activeProps={active} activeOptions={{ exact: true }}>{label(l)}</Link>
          ))}
          <Link to="/conta" className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] hover:border-mineral" activeProps={active}>
            <UserRound className="h-3.5 w-3.5" /> {user ? user.name.split(" ")[0] : "Minha conta"}
          </Link>
          {user?.role === "admin" && !user.guest && <Link to="/admin" className={cls} activeProps={active}>Admin</Link>}
        </div>
        <button className="p-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-border bg-background px-5 py-4 lg:hidden">
          {user?.role === "admin" && !user.guest && <Link to="/admin" onClick={() => setOpen(false)} className="block py-3 font-mono text-xs uppercase tracking-wider text-mineral">Administração</Link>}
          {[...LINKS, { to: "/conta", label: "Minha conta" } as const].map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block py-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground" activeProps={active} activeOptions={{ exact: true }}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
