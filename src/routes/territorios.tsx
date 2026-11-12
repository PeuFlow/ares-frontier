import { pageHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { Explorer } from "@/components/frontier/Explorer";
import { Catalog } from "@/components/frontier/Catalog";

export const Route = createFileRoute("/territorios")({
  head: () => pageHead("/territorios", "Territórios em Marte — Ares Frontier", "Globo 3D e catálogo de territórios marcianos fictícios para reserva virtual."),
  component: () => (
    <main className="pt-16">
      <h1 className="sr-only">Territórios em Marte</h1>
      <Explorer />
      <Catalog />
    </main>
  ),
});
