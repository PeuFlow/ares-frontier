import { pageHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/frontier/Hero";
import { Explorer } from "@/components/frontier/Explorer";
import { Catalog } from "@/components/frontier/Catalog";
import { Gallery } from "@/components/frontier/Gallery";
import { HowItWorks } from "@/components/frontier/HowItWorks";

export const Route = createFileRoute("/")({
  head: () => pageHead("/"),
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
