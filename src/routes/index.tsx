import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/frontier/Hero";
import { Explorer } from "@/components/frontier/Explorer";
import { Catalog } from "@/components/frontier/Catalog";
import { Gallery } from "@/components/frontier/Gallery";
import { HowItWorks } from "@/components/frontier/HowItWorks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ares Frontier — Mars Territory Exchange" },
      { name: "description", content: "Explore Marte em 3D, compare territórios fictícios e simule a reserva do seu próximo endereço em 2089." },
      { property: "og:title", content: "Ares Frontier — Mars Territory Exchange" },
      { property: "og:description", content: "Explore Marte em 3D e simule reservas de territórios demonstrativos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <Hero />
      <Explorer />
      <Catalog />
      <Gallery />
      <HowItWorks />
    </main>
  );
}
