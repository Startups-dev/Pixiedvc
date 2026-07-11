import { describe, expect, it } from "vitest";

import { PIXIE_TOOL_NAMES } from "@/lib/pixie/ai/schemas";
import { parsePixieToolRequest } from "@/lib/pixie/ai/tool-contract";
import { getPixieToolRegistry } from "@/lib/pixie/ai/tool-registry";

describe("Pixie AI tool contract", () => {
  it("registers only approved tools", () => {
    expect(Object.keys(getPixieToolRegistry()).sort()).toEqual([...PIXIE_TOOL_NAMES].sort());
  });

  it("unknown tool names fail", () => {
    expect(parsePixieToolRequest({ name: "send_email", input: {} }).success).toBe(false);
  });

  it("valid tool request parses", () => {
    expect(parsePixieToolRequest({ name: "get_planner_status", input: {} }).success).toBe(true);
  });
});

