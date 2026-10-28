import { createFileRoute } from "@tanstack/react-router";
import { Explorer } from "@/components/frontier/Explorer";
import { Catalog } from "@/components/frontier/Catalog";

export const Route = createFileRoute("/territorios")({
  head: () => ({
    meta: [
      { title: "Territórios em Marte — Ares Frontier" },
      { name: "description", content: "Globo 3D e catálogo de territórios marcianos fictícios para reserva virtual." },
      { property: "og:title", content: "Territórios — Ares Frontier" },
      { property: "og:description", content: "Explore Marte em 3D e adicione um território à sua missão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <main className="pt-16">
      <Explorer />
      <Catalog />
    </main>
  ),
});
