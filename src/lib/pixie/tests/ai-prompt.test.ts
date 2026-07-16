import { describe, expect, it } from "vitest";

import { buildPixieSystemPrompt } from "@/lib/pixie/ai/prompts";
import { PIXIE_AI_PROMPT_VERSION } from "@/lib/pixie/ai/schemas";

describe("Pixie concierge prompt", () => {
  it("contains the versioned concierge personality and interview strategy", () => {
    const prompt = buildPixieSystemPrompt([]);

    expect(prompt).toContain(PIXIE_AI_PROMPT_VERSION);
    expect(prompt).toContain("warm, calm, highly capable Disney vacation concierge");
    expect(prompt).toContain("Do not behave like a form collecting one field after another");
    expect(prompt).toContain("If the user says 'you decide'");
    expect(prompt).toContain("Side questions");
    expect(prompt).toContain("no live dining availability, menu, or restaurant database");
    expect(prompt).toContain("Do not introduce a specific restaurant name");
    expect(prompt).toContain("write plain text");
    expect(prompt).toContain("Do not use Markdown");
  });
});
