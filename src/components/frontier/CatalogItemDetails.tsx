import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { catalogDetail, type Recommendation } from "@/lib/ai-api";
import { catalogImageUrl } from "@/lib/catalog-images";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CatalogAttributes, CatalogPrice, CATALOG_ROUTES } from "./RecommendationCard";

export function catalogSearch(search: Record<string, unknown>): { catalog_item?: string } {
  return typeof search["catalog_item"] === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search["catalog_item"])
    ? { catalog_item: search["catalog_item"] }
    : {};
}

// Static demo dialogs cannot resolve PostgreSQL UUIDs. This view shares their UI
// pattern and loads the authoritative record; no lookup by name or guessed slug.
export function CatalogItemDetails({ category }: { category: Recommendation["category"] }) {
  const id = useRouterState({
    select: (state) => (state.location.search as { catalog_item?: string }).catalog_item,
  });
  const navigate = useNavigate();
  const [item, setItem] = useState<Recommendation | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setItem(null);
    setError("");
    if (id)
      void catalogDetail(id)
        .then((record) => {
          if (!active) return;
          if (record.category !== category) setError("Este item pertence a outra categoria.");
          else setItem(record);
        })
        .catch((cause) => {
          if (active)
            setError(
              cause instanceof Error ? cause.message : "Não foi possível consultar este item.",
            );
        });
    return () => {
      active = false;
    };
  }, [id, category]);
  return (
    <Dialog
      open={Boolean(id)}
      onOpenChange={(open) => {
        if (!open) void navigate({ to: CATALOG_ROUTES[category], search: {}, replace: true });
      }}
    >
      <DialogContent className="max-h-[85dvh] max-w-xl overflow-y-auto rounded-xl border-primary/25 bg-card">
        <DialogHeader>
          <DialogTitle>{item?.name ?? "Detalhes do catálogo"}</DialogTitle>
          <DialogDescription>
            {item?.description ?? (error || "Consultando o registro…")}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-mineral">
            {error}
          </p>
        )}
        {item && (
          <>
            {item.image_url && (
              <img
                src={catalogImageUrl(item.image_url)}
                alt={item.name}
                className="aspect-video w-full rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
            )}
            <p className="font-mono text-xs text-mineral">{item.code}</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CatalogPrice item={item} />
              <span className="text-sm">{item.available ? "Disponível" : "Indisponível"}</span>
            </div>
            <CatalogAttributes attributes={item.attributes} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
