import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { FrontierProvider } from "@/hooks/use-frontier";
import { Navbar } from "@/components/frontier/Navbar";
import { Hero } from "@/components/frontier/Hero";
import { Explorer } from "@/components/frontier/Explorer";
import { Catalog } from "@/components/frontier/Catalog";
import { HowItWorks } from "@/components/frontier/HowItWorks";
import { Footer } from "@/components/frontier/Footer";
import { CompareBar, CompareDialog, DetailsDialog, ReserveDialog } from "@/components/frontier/Dialogs";

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
    <FrontierProvider>
      <Navbar />
      <main>
        <Hero />
        <Explorer />
        <Catalog />
        <HowItWorks />
      </main>
      <Footer />
      <CompareBar />
      <DetailsDialog />
      <ReserveDialog />
      <CompareDialog />
      <Toaster position="top-right" toastOptions={{ classNames: { toast: "!rounded-sm !border-border !bg-card !text-foreground !font-mono !text-xs" } }} />
    </FrontierProvider>
  );
}
