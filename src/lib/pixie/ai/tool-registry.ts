import type { PixieModelToolDefinition } from "@/lib/pixie/ai/provider";
import type { PixieRegisteredTool } from "@/lib/pixie/ai/tool-contract";
import {
  applyTripPatchInputSchema,
  findReadyStaysInputSchema,
  generatePlanOutlineInputSchema,
  getPlannerStatusInputSchema,
  recommendResortsInputSchema,
} from "@/lib/pixie/ai/tool-contract";
import { getPlannerStatusTool } from "@/lib/pixie/tools/get-planner-status";
import { updateTripStateTool } from "@/lib/pixie/tools/update-trip-state";
import { recommendResortsTool } from "@/lib/pixie/tools/recommend-resorts";
import { findReadyStaysTool } from "@/lib/pixie/tools/find-ready-stays";
import { generatePlanOutlineTool } from "@/lib/pixie/tools/generate-plan-outline";

export function getPixieToolRegistry(): Record<string, PixieRegisteredTool> {
  return {
    get_planner_status: {
      name: "get_planner_status",
      description: "Return completeness, readiness flags, planning stage, and suggested next-question key.",
      readOnly: true,
      confirmationRequired: false,
      timeoutMs: 1000,
      inputSchema: getPlannerStatusInputSchema,
      execute: getPlannerStatusTool,
    },
    apply_trip_patch: {
      name: "apply_trip_patch",
      description: "Apply a validated patch to the current in-memory planner state for this turn only.",
      readOnly: false,
      confirmationRequired: false,
      timeoutMs: 1000,
      inputSchema: applyTripPatchInputSchema,
      execute: updateTripStateTool,
    },
    recommend_resorts: {
      name: "recommend_resorts",
      description: "Call the deterministic Pixie resort recommendation service.",
      readOnly: true,
      confirmationRequired: false,
      timeoutMs: 5000,
      inputSchema: recommendResortsInputSchema,
      execute: recommendResortsTool,
    },
    find_ready_stays: {
      name: "find_ready_stays",
      description: "Call the deterministic public-visible Ready Stay matching service.",
      readOnly: true,
      confirmationRequired: false,
      timeoutMs: 5000,
      inputSchema: findReadyStaysInputSchema,
      execute: findReadyStaysTool,
    },
    generate_plan_outline: {
      name: "generate_plan_outline",
      description: "Produce a simple non-authoritative planning outline from trusted planner state and tool results.",
      readOnly: true,
      confirmationRequired: false,
      timeoutMs: 1000,
      inputSchema: generatePlanOutlineInputSchema,
      execute: generatePlanOutlineTool,
    },
  };
}

export function getPixieModelToolDefinitions(): PixieModelToolDefinition[] {
  return Object.values(getPixieToolRegistry()).map((tool) => ({
    name: tool.name,
    description: tool.description,
    readOnly: tool.readOnly,
    confirmationRequired: tool.confirmationRequired,
    inputSchemaDescription: tool.inputSchema.description ?? tool.inputSchema.constructor.name,
  }));
}

