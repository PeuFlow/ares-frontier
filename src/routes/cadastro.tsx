import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell, Field, PasswordField, isEmail } from "@/components/frontier/AuthShell";
import { useMission } from "@/hooks/use-mission";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar conta — Ares Frontier" },
      { name: "description", content: "Crie sua conta de explorador na Ares Frontier." },
      { property: "og:title", content: "Criar conta — Ares Frontier" },
      { property: "og:description", content: "Cadastro da plataforma conceitual Ares Frontier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const { register } = useMission();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", pw: "", pw2: "" });
  const [err, setErr] = useState<Partial<Record<keyof typeof f | "form", string>>>({});
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n: typeof err = {};
    if (f.name.trim().length < 2) n.name = "Informe seu nome.";
    if (f.name.trim().length > 120) n.name = "Nome muito longo.";
    if (!isEmail(f.email)) n.email = "Informe um e-mail válido.";
    if (f.pw.length < 12 || f.pw.length > 128) n.pw = "Use entre 12 e 128 caracteres.";
    if (f.pw2 !== f.pw) n.pw2 = "As senhas não coincidem.";
    setErr(n);
    if (Object.keys(n).length) return;
    setLoading(true);
    try {
      await register(f.name.trim(), f.email.trim(), f.pw);
      await nav({ to: "/conta" });
    } catch (error) {
      setErr({ form: error instanceof Error ? error.message : "Não foi possível criar a conta." });
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="JUNTE-SE À FRONTEIRA">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Nome" autoComplete="name" value={f.name} onChange={set("name")} error={err.name} />
        <Field label="E-mail" type="email" autoComplete="email" value={f.email} onChange={set("email")} error={err.email} />
        <PasswordField label="Senha" autoComplete="new-password" value={f.pw} onChange={set("pw")} error={err.pw} />
        <PasswordField label="Confirmar senha" autoComplete="new-password" value={f.pw2} onChange={set("pw2")} error={err.pw2} />
        {err.form && <p role="alert" className="text-sm text-destructive">{err.form}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" /> Registrando…</> : "Criar conta"}</Button>
      </form>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Já tem conta? <Link to="/login" className="text-mineral hover:underline">Entrar</Link></p>
    </AuthShell>
  );
}
