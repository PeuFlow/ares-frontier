import { pageHead } from "@/lib/seo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell, Field, PasswordField, isEmail } from "@/components/frontier/AuthShell";
import { useMission } from "@/hooks/use-mission";

export const Route = createFileRoute("/login")({
  head: () => pageHead("/login", "Entrar — Ares Frontier", "Acesse a Central de Missões da Ares Frontier."),
  component: Login,
});

export function Login() {
  const { signIn, enterGuest, authError } = useMission();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<{ email?: string; pw?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof err = {};
    if (!isEmail(email)) next.email = "Informe um e-mail válido.";
    if (!pw || pw.length > 128) next.pw = "Informe sua senha (até 128 caracteres).";
    setErr(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await signIn(email.trim(), pw);
      await nav({ to: "/" });
    } catch (error) {
      setErr({ form: error instanceof Error ? error.message : "Não foi possível entrar." });
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="BEM-VINDO À FRONTEIRA">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err.email} />
        <PasswordField label="Senha" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} error={err.pw} />
        {(err.form || authError) && <p role="alert" className="border border-destructive/50 bg-destructive/10 p-3 font-mono text-[11px] text-destructive">{err.form || authError}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="animate-spin" /> Conectando…</> : "Entrar na central"}</Button>
      </form>
      <div className="mt-4 flex justify-between font-mono text-[10px] uppercase tracking-wider">
        <Link to="/cadastro" className="text-mineral hover:underline">Criar conta</Link>
        <Link to="/esqueci-senha" className="text-muted-foreground hover:text-foreground">Esqueci minha senha</Link>
      </div>
      <Button variant="outline" className="mt-6 w-full" disabled={loading} onClick={async () => {
        setLoading(true);
        try { await enterGuest(); await nav({ to: "/" }); }
        catch (error) { setErr({ form: error instanceof Error ? error.message : "Não foi possível continuar." }); }
        finally { setLoading(false); }
      }}>Explorar como visitante</Button>
    </AuthShell>
  );
}
