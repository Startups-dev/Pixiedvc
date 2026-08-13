import { describe, expect, it } from "vitest";

import { buildPixieSystemPrompt } from "@/lib/pixie/ai/prompts";
import { PIXIE_AI_PROMPT_VERSION } from "@/lib/pixie/ai/schemas";

describe("Pixie concierge prompt", () => {
  it("contains the versioned Hara personality and answer-first strategy", () => {
    const prompt = buildPixieSystemPrompt([]);

    expect(prompt).toContain(PIXIE_AI_PROMPT_VERSION);
    expect(prompt).toContain("warm, observant, highly capable Disney vacation guide");
    expect(prompt).toContain("Answer-first rule");
    expect(prompt).toContain("answer the user's immediate question first");
    expect(prompt).toContain("do not say you will compare or decide later");
    expect(prompt).toContain("normally give a clear choice");
    expect(prompt).toContain("Ignoring price for the moment");
    expect(prompt).toContain("translate facts into consequences for this family");
    expect(prompt).toContain("do not automatically agree with the user");
    expect(prompt).toContain("Do not behave like a form collecting one field after another");
    expect(prompt).toContain("change only what is relevant");
    expect(prompt).toContain("DVC rule context");
    expect(prompt).toContain("DVC confidence");
    expect(prompt).toContain("knownConsequences");
    expect(prompt).toContain("lead with knownConsequences from verified/stable DVC results");
    expect(prompt).toContain("modeled cancellation/Holding timing");
    expect(prompt).toContain("provenance.status needs_review");
    expect(prompt).toContain("Trusted Hanna knowledge");
    expect(prompt).toContain("knowledgeContext");
    expect(prompt).toContain("Live gaps and knowledge gaps must not make you refuse the rest of a mixed question");
    expect(prompt).toContain("when trusted dining candidates exist in knowledgeContext, use their names");
    expect(prompt).toContain("Discovery guidance");
    expect(prompt).toContain("one unusually relevant Disney-specific insight");
    expect(prompt).toContain("Do not claim live reservation availability");
    expect(prompt).toContain("write plain text");
    expect(prompt).toContain("compact numbered lines");
    expect(prompt).toContain("My pick");
  });
});
