import { describe, expect, it } from "vitest";

import { resolvePixieConversationLanguage } from "@/lib/pixie/language";

describe("Pixie conversation language", () => {
  it("detects Portuguese from the latest meaningful user turn", () => {
    expect(resolvePixieConversationLanguage({ latestUserMessage: "Qual o resort mais fácil para voltar depois da festa?" })).toBe("pt");
  });

  it("keeps English conversations in English", () => {
    expect(resolvePixieConversationLanguage({ latestUserMessage: "Which resort is easiest after the party?" })).toBe("en");
  });

  it("allows an intentional switch from Portuguese to English", () => {
    expect(
      resolvePixieConversationLanguage({
        latestUserMessage: "Which resort is easiest after the party?",
        recentMessages: [{ role: "user", content: "Eu vou para a Disney em setembro." }],
      }),
    ).toBe("en");
  });
});
