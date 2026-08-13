export type PixieConversationLanguage = "en" | "pt";

function hasPortugueseSignals(text: string) {
  return /\b(eu|meu|minha|marido|filha|filho|crian[çc]a|ser[aã]o|vamos|vou|pagaremos|mais f[aá]cil|voltar|depois|festa|resort mais apropriado|qual o resort)\b/i.test(text);
}

function hasEnglishSignals(text: string) {
  return /\b(i|i'm|we|we're|our|my|wife|husband|daughter|son|child|children|toddler|which resort|easy|easiest|after|party|pay more)\b/i.test(text);
}

export function resolvePixieConversationLanguage(input: {
  latestUserMessage?: string;
  recentMessages?: Array<{ role?: string; content: string }>;
}): PixieConversationLanguage {
  const latest = input.latestUserMessage?.trim() ?? "";
  if (latest) {
    if (hasPortugueseSignals(latest)) return "pt";
    if (hasEnglishSignals(latest)) return "en";
  }
  for (const message of [...(input.recentMessages ?? [])].reverse()) {
    if (message.role && message.role !== "user") continue;
    if (hasPortugueseSignals(message.content)) return "pt";
    if (hasEnglishSignals(message.content)) return "en";
  }
  return "en";
}
