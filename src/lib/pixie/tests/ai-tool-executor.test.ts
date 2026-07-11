import { describe, expect, it } from "vitest";

import { executePixieTool, dedupePixieToolRequests } from "@/lib/pixie/ai/tool-executor";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";

describe("Pixie AI tool executor", () => {
  it("executes planner status tool", async () => {
    const result = await executePixieTool({
      toolRequest: { name: "get_planner_status", input: {} },
      currentState: createEmptyPixieTripState("2026-07-11T12:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
    expect(result.toolName).toBe("get_planner_status");
  });

  it("validates tool input", async () => {
    const result = await executePixieTool({
      toolRequest: { name: "recommend_resorts", input: { topLimit: 999 } },
      currentState: createEmptyPixieTripState(),
    });
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.errorCode).toBe("tool_input_invalid");
  });

  it("deduplicates safe duplicate tool requests", () => {
    const requests = dedupePixieToolRequests([
      { name: "get_planner_status", input: {} },
      { name: "get_planner_status", input: {} },
      { name: "generate_plan_outline", input: {} },
    ]);
    expect(requests.map((request) => request.name)).toEqual(["get_planner_status", "generate_plan_outline"]);
  });

  it("applies in-memory trip patch without persistence", async () => {
    const result = await executePixieTool({
      toolRequest: { name: "apply_trip_patch", input: { patch: { party: { adults: 2, children: 1 } } } },
      currentState: createEmptyPixieTripState("2026-07-11T12:00:00.000Z"),
      now: "2026-07-11T12:01:00.000Z",
    });
    expect(result.ok).toBe(true);
    const payload = result.ok ? (result.result as { state: ReturnType<typeof normalizePixieTripState> }) : null;
    expect(payload?.state.party.totalPartySize).toBe(3);
  });
});

