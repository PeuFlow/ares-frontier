import { apiRequest } from "./auth-api";

export type AISection =
  | "inicio"
  | "explorar"
  | "territorios"
  | "viagens"
  | "hospedagens"
  | "experiencias"
  | "missao"
  | "conta"
  | "como-funciona"
  | "nave"
  | "admin";
export interface AIContext {
  section: AISection;
  element_id?: string;
}
export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  recommendations?: Recommendation[];
}
export interface Recommendation {
  id: string;
  code: string;
  category: "terrain" | "trip" | "accommodation" | "experience";
  name: string;
  description: string;
  price: string;
  currency: string;
  available: boolean;
  image_url: string | null;
  attributes: Record<string, unknown>;
  score: number;
  match: "high" | "partial" | "none";
  matched: string[];
  missing: string[];
  reason: string;
  detail_path: string;
}
export interface AIReply {
  message: string;
  section: AISection | null;
  sources: { slug: string; title: string }[];
  cached: boolean;
  recommendations?: Recommendation[];
  recommendation_context?: string | null;
}

export function recentHistory(messages: AIMessage[]): AIMessage[] {
  // Keep complete user/assistant pairs, newest first within the character budget.
  const selected: AIMessage[] = [];
  let size = 0;
  for (let i = messages.length - 2; i >= 0 && selected.length < 10; i -= 2) {
    const pair = messages.slice(i, i + 2).map(({ role, content }) => ({ role, content }));
    const chars = pair.reduce((sum, m) => sum + m.content.length, 0);
    if (size + chars > 8000) break;
    selected.unshift(...pair);
    size += chars;
  }
  return selected;
}

export const sectionContext = (context: AIContext) =>
  apiRequest<AIReply>("ai/section-context", context);
export const astronautChat = (
  message: string,
  history: AIMessage[],
  context: AIContext,
  recommendation_context?: string | null,
) =>
  apiRequest<AIReply>("ai/chat", {
    message,
    history: recentHistory(history),
    context,
    recommendation_context,
  });

export const catalogDetail = (id: string) =>
  apiRequest<Recommendation>(`ai/catalog/${encodeURIComponent(id)}`);
