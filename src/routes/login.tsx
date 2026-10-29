import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell, Field, PasswordField, isEmail, wait } from "@/components/frontier/AuthShell";
import { useMission } from "@/hooks/use-mission";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Ares Frontier" },
      { name: "description", content: "Acesse a Central de Missões demonstrativa da Ares Frontier." },
      { property: "og:title", content: "Retorne à fronteira — Ares Frontier" },
      { property: "og:description", content: "Login demonstrativo da plataforma conceitual Ares Frontier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

export function Login() {
  const { signIn } = useMission();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<{ email?: string; pw?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof err = {};
    if (!isEmail(email)) next.email = "Informe um e-mail válido.";
    if (pw.length < 6) next.pw = "A senha precisa ter ao menos 6 caracteres.";
    setErr(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    await wait(700);
    if (pw === "erro123") { setLoading(false); setErr({ form: "Falha na comunicação com a central. Tente novamente." }); return; }
    signIn({ name: email.split("@")[0] || "Explorador", email: email.trim(), guest: false });
    nav({ to: "/" });
  };

  return (
    <AuthShell title="BEM-VINDO À FRONTEIRA">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err.email} />
        <PasswordField label="Senha" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} error={err.pw} />
        {err.form && <p role="alert" className="border border-destructive/50 bg-destructive/10 p-3 font-mono text-[11px] text-destructive">{err.form}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" /> Conectando…</> : "Entrar na central"}</Button>
      </form>
      <div className="mt-4 flex justify-between font-mono text-[10px] uppercase tracking-wider">
        <Link to="/cadastro" className="text-mineral hover:underline">Criar conta</Link>
        <Link to="/esqueci-senha" className="text-muted-foreground hover:text-foreground">Esqueci minha senha</Link>
      </div>
      <Button variant="outline" className="mt-6 w-full" onClick={() => { signIn({ name: "Visitante", email: "", guest: true }); nav({ to: "/" }); }}>Explorar como visitante</Button>
    </AuthShell>
  );
}
