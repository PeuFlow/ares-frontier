import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LogoMark } from "./Logo";
import orbit from "@/assets/trip-orbit.jpg";

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={orbit} alt="Marte visto da órbita" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background" />
        <p className="absolute bottom-10 left-10 max-w-xs font-display text-2xl">O futuro começa em novas fronteiras.</p>
      </div>
      <div className="tech-grid flex items-center justify-center px-5 py-16">
        <div className="instrument corner-ticks w-full max-w-md animate-rise p-8">
          <Link to="/" className="flex items-center gap-3"><LogoMark /><span className="font-display text-sm font-semibold tracking-[0.24em]">ARES FRONTIER</span></Link>
          <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-6">{children}</div>
          <p className="mt-6 border-t border-border pt-4 font-mono text-[10px] leading-relaxed text-muted-foreground">
            Autenticação demonstrativa, <span className="text-mineral">não segura</span>. Senhas não são salvas. Não use dados reais.
          </p>
        </div>
      </div>
    </main>
  );
}

export function Field({ label, error, ...p }: { label: string; error?: string | undefined } & React.ComponentProps<"input">) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <Input {...p} aria-invalid={!!error} className="mt-1 h-11 rounded-sm bg-background" />
      {error && <span className="mt-1 block font-mono text-[11px] text-destructive">{error}</span>}
    </label>
  );
}

export function PasswordField(p: { label: string; error?: string | undefined } & React.ComponentProps<"input">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Field {...p} type={show ? "text" : "password"} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar senha" : "Mostrar senha"} className="absolute right-3 top-[30px] p-1 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
