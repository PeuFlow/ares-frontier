import { pageHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthShell, Field, isEmail } from "@/components/frontier/AuthShell";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => pageHead("/esqueci-senha", "Recuperar senha — Ares Frontier", "Recuperação de senha demonstrativa da Ares Frontier."),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string>();
  const [sent, setSent] = useState(false);
  return (
    <AuthShell title="RECUPERAR ACESSO">
      {sent ? (
        <p className="text-sm text-muted-foreground">Simulação: em uma versão real, enviaríamos um link para <span className="text-foreground">{email}</span>. Nenhum e-mail foi enviado.</p>
      ) : (
        <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!isEmail(email)) return setErr("Informe um e-mail válido."); setSent(true); }}>
          <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={err} />
          <Button type="submit" className="w-full">Enviar instruções</Button>
        </form>
      )}
      <Link to="/login" className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-mineral hover:underline">← Voltar ao login</Link>
    </AuthShell>
  );
}
