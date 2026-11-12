import { TRIPS, STAYS, EXPERIENCES } from "@/data/catalog";
import { TERRITORIES } from "@/data/territories";
import type { AIContext, AISection } from "./ai-api";

const explanations: Record<AISection, string> = {
  inicio:
    "Aqui começa sua exploração de Marte. Conheça os territórios no globo e escolha o próximo destino da sua missão.",
  explorar:
    "Gire o globo e escolha um marcador para conhecer o território, seus recursos e suas características.",
  territorios:
    "Aqui você pode conhecer os terrenos, filtrar por perfil, comparar regiões e consultar os detalhes de cada território.",
  viagens:
    "Compare as expedições por duração, capacidade e itens inclusos para escolher a viagem da sua missão.",
  hospedagens:
    "Conheça os habitats e suas comodidades. Escolha o número de noites para calcular o total da hospedagem.",
  experiencias:
    "Estas atividades complementam sua missão. Veja a duração e a descrição de cada experiência antes de escolher.",
  missao:
    "Aqui você reúne sua viagem, hospedagem, experiências e território, e confere o total da missão.",
  conta: "Na sua conta você encontra o perfil e o planejamento disponível neste navegador.",
  "como-funciona":
    "Explore os territórios, compare suas características e reúna suas escolhas para simular uma missão.",
  nave: "Use a nave para me soltar, recolher ou abrir nossa conversa. Posso explicar os locais enquanto exploramos.",
  admin: "Esta área reúne os controles de administração para os responsáveis pela plataforma.",
};

// Immediate information from the same catalog used by the visible cards.
// The AI can expand this explanation without leaving the explorer waiting in silence.
export function explainAstronautContext(context: AIContext): string {
  const id = context.element_id;
  if (id) {
    if (context.section === "territorios" || context.section === "explorar") {
      const territory = TERRITORIES.find((item) => item.id === id);
      return territory ? `${territory.region}: ${territory.summary}` : "";
    }
    const items =
      context.section === "viagens"
        ? TRIPS
        : context.section === "hospedagens"
          ? STAYS
          : context.section === "experiencias"
            ? EXPERIENCES
            : [];
    const item = items.find((entry) => entry.id === id);
    return item ? `${item.name}: ${item.description}` : "";
  }
  return explanations[context.section];
}
