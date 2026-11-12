// Public frontend URL documented in README.md; the API has a different origin.
export const SITE_URL = "https://ares-frontier-eqed.vercel.app";
export const SITE_TITLE = "Ares Frontier | Explore Marte";
export const SITE_DESCRIPTION = "Explore Marte com a Ares Frontier! Descubra territórios marcianos, planeje viagens espaciais, conheça hospedagens e viva experiências em uma plataforma futurista e interativa.";
export const SOCIAL_IMAGE = `${SITE_URL}/images/ares-frontier-social.png`;

const PUBLIC_PATHS = new Set(["/", "/territorios", "/viagens", "/hospedagens", "/experiencias"]);

export function pageHead(path: string, title = SITE_TITLE, description = SITE_DESCRIPTION) {
  const url = new URL(path, SITE_URL).href;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: PUBLIC_PATHS.has(path) ? "index, follow" : "noindex, nofollow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Ares Frontier" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Ares Frontier — Explore Marte. Paisagem marciana e símbolo de planeta com órbita." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: SOCIAL_IMAGE },
      { name: "twitter:image:alt", content: "Ares Frontier — Explore Marte" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
