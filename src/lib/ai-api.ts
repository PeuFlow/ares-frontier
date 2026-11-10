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
}
export interface AIReply {
  message: string;
  section: AISection | null;
  sources: { slug: string; title: string }[];
  cached: boolean;
}

export function recentHistory(messages: AIMessage[]): AIMessage[] {
  // Keep complete user/assistant pairs, newest first within the character budget.
  const selected: AIMessage[] = [];
  let size = 0;
  for (let i = messages.length - 2; i >= 0 && selected.length < 10; i -= 2) {
    const pair = messages.slice(i, i + 2);
    const chars = pair.reduce((sum, m) => sum + m.content.length, 0);
    if (size + chars > 8000) break;
    selected.unshift(...pair);
    size += chars;
  }
  return selected;
}

export const sectionContext = (context: AIContext) =>
  apiRequest<AIReply>("ai/section-context", context);
export const astronautChat = (message: string, history: AIMessage[], context: AIContext) =>
  apiRequest<AIReply>("ai/chat", { message, history: recentHistory(history), context });
