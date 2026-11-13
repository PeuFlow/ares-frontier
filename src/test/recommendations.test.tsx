import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RecommendationCard } from "@/components/frontier/RecommendationCard";
import { catalogSearch, CatalogItemDetails } from "@/components/frontier/CatalogItemDetails";
import { recentHistory, type Recommendation } from "@/lib/ai-api";
import { catalogImageUrl } from "@/lib/catalog-images";

const state = vi.hoisted(() => ({
  id: "b433a560-d19a-4b63-937f-ff8762ed07d9",
  detail: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    search,
    onClick,
    children,
  }: {
    to: string;
    search: { catalog_item: string };
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <a
      href={`${to}?catalog_item=${search.catalog_item}`}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  ),
  useRouterState: () => state.id,
  useNavigate: () => state.navigate,
}));
vi.mock("@/lib/ai-api", async (original) => ({
  ...(await original<typeof import("@/lib/ai-api")>()),
  catalogDetail: state.detail,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const item: Recommendation = {
  id: state.id,
  code: "SETOR-1",
  category: "terrain",
  name: "Território cadastrado",
  description: "Descrição original",
  price: "1234.50",
  currency: "MC",
  available: true,
  image_url: null,
  attributes: { area_km2: 12 },
  score: 50,
  match: "partial",
  matched: ["Área"],
  missing: ["Vista"],
  reason: "Área compatível. Vista não cadastrada.",
  detail_path: `/territorios?catalog_item=${state.id}`,
};

it.each([
  ["terrain", "/territorios", "Conhecer território"],
  ["trip", "/viagens", "Ver viagem"],
  ["accommodation", "/hospedagens", "Conhecer hospedagem"],
  ["experience", "/experiencias", "Ver experiência"],
] as const)("links %s to its category and real UUID", (category, route, action) => {
  const close = vi.fn();
  render(<RecommendationCard item={{ ...item, category }} onNavigate={close} />);
  expect(screen.getByRole("link", { name: action })).toHaveAttribute(
    "href",
    `${route}?catalog_item=${item.id}`,
  );
  fireEvent.click(screen.getByRole("link"));
  expect(close).toHaveBeenCalledOnce();
  expect(screen.getByText("Correspondência parcial", { exact: false })).toBeInTheDocument();
  expect(screen.getByText("1.234,5 MC")).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(screen.getByText("Não confirmado ou não atendido: Vista")).toBeInTheDocument();
});

it("loads details using the UUID and current availability", async () => {
  state.detail.mockResolvedValue({ ...item, available: false });
  render(<CatalogItemDetails category="terrain" />);
  expect(await screen.findByText("Indisponível")).toBeInTheDocument();
  expect(state.detail).toHaveBeenCalledWith(item.id);
  expect(screen.getByRole("heading", { name: item.name })).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(state.navigate).toHaveBeenCalledWith({ to: "/territorios", search: {}, replace: true });
});

it("reports removed items and category mismatch", async () => {
  state.detail.mockResolvedValue({ ...item, category: "trip" });
  render(<CatalogItemDetails category="terrain" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("outra categoria");
  cleanup();
  state.detail.mockRejectedValue(new Error("Este item não está mais no catálogo."));
  render(<CatalogItemDetails category="terrain" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("não está mais no catálogo");
});

it("validates search UUIDs and strips card data from model history", () => {
  expect(catalogSearch({ catalog_item: item.id })).toEqual({ catalog_item: item.id });
  expect(catalogSearch({ catalog_item: "fake" })).toEqual({});
  expect(
    recentHistory([
      { role: "user", content: "Quero terreno" },
      { role: "assistant", content: "Confira", recommendations: [item] },
    ]),
  ).toEqual([
    { role: "user", content: "Quero terreno" },
    { role: "assistant", content: "Confira" },
  ]);
});

it("resolves imported catalog images using Vite and keeps database image URLs", () => {
  const image = catalogImageUrl("/src/assets/terrain-valles.jpg");
  expect(image).toBeTruthy();
  render(<RecommendationCard item={{ ...item, image_url: "/src/assets/terrain-valles.jpg" }} />);
  expect(screen.getByRole("img")).toHaveAttribute("src", image);
  expect(catalogImageUrl("https://example.com/catalog.jpg")).toBe(
    "https://example.com/catalog.jpg",
  );
  expect(catalogImageUrl(null)).toBeUndefined();
});

it("shows nightly pricing for imported accommodations without duplicating aliased attributes", () => {
  render(
    <RecommendationCard
      item={{
        ...item,
        category: "accommodation",
        attributes: {
          price_unit: "night",
          area_km2: 12,
          areaKm2: 12,
          duration_days: 7,
          days: 7,
        },
      }}
    />,
  );
  expect(screen.getByText("/ noite")).toBeInTheDocument();
  expect(screen.getAllByText("Área (km²)")).toHaveLength(1);
  expect(screen.getAllByText("Duração (dias)")).toHaveLength(1);
});
