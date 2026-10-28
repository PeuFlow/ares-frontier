import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoNotice, PageHeader } from "@/components/frontier/PageHeader";
import { formatMC } from "@/data/territories";
import { useMission } from "@/hooks/use-mission";
import { useFrontier } from "@/hooks/use-frontier";

export const Route = createFileRoute("/conta")({
  head: () => ({
    meta: [
      { title: "Central de Missões — Ares Frontier" },
      { name: "description", content: "Sua área demonstrativa: missões, reservas simuladas, favoritos e histórico." },
      { property: "og:title", content: "Central de Missões — Ares Frontier" },
      { property: "og:description", content: "Área do explorador demonstrativa da Ares Frontier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, signOut, lines, total, reservations, history } = useMission();
  const { favorites, byId, openDetails } = useFrontier();
  const nav = useNavigate();

  if (!user) {
    return (
      <main>
        <PageHeader eyebrow="Central de Missões" title="Identifique-se para continuar">Entre na conta demonstrativa ou explore como visitante.</PageHeader>
        <div className="mx-auto flex max-w-7xl gap-3 px-5 py-12 md:px-8">
          <Button asChild><Link to="/login">Entrar</Link></Button>
          <Button asChild variant="outline"><Link to="/cadastro">Criar conta</Link></Button>
        </div>
      </main>
    );
  }

  const Panel = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
    <section className={`border border-border bg-card p-5 ${className}`}><p className="eyebrow">{title}</p><div className="mt-4">{children}</div></section>
  );

  return (
    <main>
      <PageHeader eyebrow="Central de Missões" title={`Olá, ${user.name.split(" ")[0]}.`}>
        {user.guest ? "Você está explorando como visitante." : "Bem-vindo de volta à fronteira."}
      </PageHeader>
      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 md:grid-cols-3 md:px-8">
        <Panel title="Perfil do explorador">
          <p className="font-display text-xl">{user.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{user.email || "sem e-mail · visitante"}</p>
          <p className="mt-3 font-mono text-[10px] uppercase text-mineral">{user.guest ? "Visitante" : "Explorador demonstrativo"}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => { signOut(); nav({ to: "/" }); }}><LogOut /> Sair da conta demonstrativa</Button>
        </Panel>
        <Panel title="Minha missão atual" className="md:col-span-2">
          {lines.length ? (
            <>
              <ul className="space-y-1 font-mono text-xs">{lines.map((l) => <li key={l.kind + l.id} className="flex justify-between"><span>{l.kind} · {l.label}</span><span>{formatMC(l.priceMC)}</span></li>)}</ul>
              <p className="mt-3 font-display text-xl text-mineral">{formatMC(total)}</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Nenhum item em planejamento.</p>}
          <Button asChild size="sm" className="mt-4"><Link to="/missao">Abrir planejador</Link></Button>
        </Panel>
        <Panel title="Reservas demonstrativas" className="md:col-span-2">
          {reservations.length ? (
            <ul className="divide-y divide-border">
              {reservations.map((r) => (
                <li key={r.protocol} className="flex flex-wrap justify-between gap-2 py-3 font-mono text-xs">
                  <span className="text-mineral">{r.protocol}</span>
                  <span className="text-muted-foreground">{new Date(r.date).toLocaleDateString("pt-BR")} · {r.lines.length} itens</span>
                  <span>{formatMC(r.total)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Nenhuma simulação concluída ainda.</p>}
        </Panel>
        <Panel title="Favoritos">
          {favorites.length ? (
            <ul className="space-y-2">{favorites.map((id) => { const t = byId(id); return t && <li key={id}><button className="text-left text-sm hover:text-mineral" onClick={() => openDetails(id)}>{t.region} <span className="font-mono text-[10px] text-muted-foreground">{t.lot}</span></button></li>; })}</ul>
          ) : <p className="text-sm text-muted-foreground">Favorite territórios no catálogo.</p>}
        </Panel>
        <Panel title="Histórico de atividades" className="md:col-span-3">
          {history.length ? (
            <ul className="space-y-1 font-mono text-[11px]">{history.slice(0, 10).map((h, i) => <li key={i}><span className="text-muted-foreground">{new Date(h.at).toLocaleString("pt-BR")}</span> · {h.text}</li>)}</ul>
          ) : <p className="text-sm text-muted-foreground">Sem atividades.</p>}
        </Panel>
        <div className="md:col-span-3"><DemoNotice>Conta demonstrativa local, sem autenticação segura. Dados ficam apenas neste navegador.</DemoNotice></div>
      </div>
    </main>
  );
}
