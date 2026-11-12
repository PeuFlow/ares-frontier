// Local Vite demonstration only. This entry is not included in the application build.
// Simulated responses are confined to this document; no credentials or API mutations.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createRootRoute,
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { MissionProvider } from "../src/hooks/use-mission";
import { FrontierProvider } from "../src/hooks/use-frontier";
import { AstroBuddy } from "../src/components/frontier/AstroBuddy";
import { demoAstronautReply } from "./astronauta-responses";
import "../src/styles.css";

let failNext = false;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
window.fetch = async (resource, options) => {
  const url = new URL(
    typeof resource === "string"
      ? resource
      : resource instanceof URL
        ? resource.href
        : resource.url,
    window.location.href,
  );
  if (url.pathname === "/api/auth/me")
    return json({ id: "ux-preview", name: "Explorador", email: "", guest: false });
  if (url.pathname.startsWith("/api/ai/")) {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    if (failNext) {
      failNext = false;
      return json({ detail: "O rádio está sem sinal. Tente novamente." }, 503);
    }
    const body = JSON.parse(String(options?.body || "{}"));
    return json({
      message: url.pathname.endsWith("section-context")
        ? "Estamos explorando **" +
          (body.section || "Marte") +
          "**. Observe as opções com calma; posso ajudar você a escolher seu próximo destino."
        : demoAstronautReply(body.message ?? "", body.history ?? []),
      section: null,
      sources: [],
      cached: false,
    });
  }
  // Never contact the real backend from this simulated demonstration.
  return json({ detail: "Recurso indisponível na demonstração visual." }, 403);
};

export function Demo() {
  const [section, setSection] = useState("territorios");
  const [armed, setArmed] = useState(false);
  return (
    <MissionProvider>
      <FrontierProvider>
        <main className="min-h-dvh bg-background px-6 py-10 sm:px-12">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow text-mineral">ARES FRONTIER / REVISÃO LOCAL</p>
            <h1 className="mt-5 font-display text-3xl sm:text-5xl">
              Seu companheiro de exploração.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
              Demonstração interativa do redesign. As respostas e a sessão são simuladas nesta
              página; o Gemini e o banco de dados não são acessados.
            </p>
            <div className="mt-8 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg">Comece pela nave no canto inferior esquerdo</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-muted-foreground">
                <li>Abra “Conversar com o astronauta” e escolha uma sugestão.</li>
                <li>Envie com Enter e observe o processamento e a resposta.</li>
                <li>Feche e reabra a conversa para conferir o histórico.</li>
                <li>Teste uma falha com o botão abaixo e reenvie a pergunta.</li>
                <li>Selecione “Soltar astronauta” para ver o guia contextual.</li>
              </ol>
              <button
                type="button"
                onClick={() => {
                  failNext = true;
                  setArmed(true);
                }}
                className="mt-6 min-h-11 rounded-lg border border-mineral/40 px-4 text-sm text-mineral hover:bg-muted"
              >
                Simular falha na próxima resposta
              </button>
              <p role="status" className="mt-2 text-xs text-muted-foreground">
                {armed
                  ? "Falha preparada. A próxima resposta simulada retornará um erro."
                  : "As respostas simuladas levam cerca de dois segundos."}
              </p>
            </div>
            <div
              className="mt-6 flex flex-wrap gap-3"
              aria-label="Seções para testar o guia contextual"
            >
              {["territorios", "hospedagens", "viagens"].map((id) => (
                <button
                  key={id}
                  type="button"
                  data-ai-section={id}
                  aria-pressed={section === id}
                  onClick={() => setSection(id)}
                  className={`min-h-11 rounded-lg border px-4 text-sm ${section === id ? "border-mineral text-mineral" : "border-border text-muted-foreground"}`}
                >
                  {id === "territorios"
                    ? "Territórios"
                    : id === "hospedagens"
                      ? "Hospedagens"
                      : "Viagens"}
                </button>
              ))}
            </div>
            <p className="mb-20 mt-8 text-xs leading-6 text-muted-foreground">
              Valide também em uma janela estreita e usando Tab, Enter e Escape. Esta demonstração
              não é publicada pelo build de produção.
            </p>
          </div>
        </main>
        <AstroBuddy />
      </FrontierProvider>
    </MissionProvider>
  );
}
const rootRoute = createRootRoute({ component: Demo });
const router = createRouter({
  routeTree: rootRoute,
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const root = createRoot(document.getElementById("root")!);
root.render(<RouterProvider router={router} />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
