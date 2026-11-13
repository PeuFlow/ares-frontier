// Resolve the exported source image against Vite's actual URL in dev and production.
// Unknown database URLs keep their original value; no matching by product name.
const catalogImages = import.meta.glob<string>("/src/assets/*.{jpg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

export function catalogImageUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  return catalogImages[url] ?? url;
}
