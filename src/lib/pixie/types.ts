import type { z } from "zod";

import type {
  PIXIE_AGE_GROUPS,
  PIXIE_BUDGET_TYPES,
  PIXIE_DESTINATIONS,
  PIXIE_EXPERIENCE_LEVELS,
  PIXIE_PLANNING_STAGES,
  PIXIE_PRIORITY_LEVELS,
  PIXIE_QUESTION_KEYS,
  PIXIE_SUPPORTED_CURRENCIES,
  PIXIE_TRAVELLER_CATEGORIES,
  PIXIE_VACATION_PACES,
} from "@/lib/pixie/constants";
import type {
  pixieTripPatchSchema,
  pixieTripStateSchema,
  pixieTravellerOperationSchema,
  pixieTravellerSchema,
} from "@/lib/pixie/schema";

export type PixieDestination = (typeof PIXIE_DESTINATIONS)[number];
export type PixiePlanningStage = (typeof PIXIE_PLANNING_STAGES)[number];
export type PixieBudgetType = (typeof PIXIE_BUDGET_TYPES)[number];
export type PixieCurrency = (typeof PIXIE_SUPPORTED_CURRENCIES)[number];
export type PixieTravellerCategory = (typeof PIXIE_TRAVELLER_CATEGORIES)[number];
export type PixieAgeGroup = (typeof PIXIE_AGE_GROUPS)[number];
export type PixieVacationPace = (typeof PIXIE_VACATION_PACES)[number];
export type PixiePriorityLevel = (typeof PIXIE_PRIORITY_LEVELS)[number];
export type PixieExperienceLevel = (typeof PIXIE_EXPERIENCE_LEVELS)[number];
export type PixieQuestionKey = (typeof PIXIE_QUESTION_KEYS)[number];

export type PixieTripState = z.infer<typeof pixieTripStateSchema>;
export type PixieTripPatch = z.infer<typeof pixieTripPatchSchema>;
export type PixieTraveller = z.infer<typeof pixieTravellerSchema>;
export type PixieTravellerOperation = z.infer<typeof pixieTravellerOperationSchema>;

export type PixiePatchErrorCode =
  | "INVALID_CURRENT_STATE"
  | "INVALID_PATCH"
  | "TRAVELLER_NOT_FOUND"
  | "DUPLICATE_TRAVELLER_ID"
  | "LIMIT_EXCEEDED"
  | "NORMALIZATION_FAILED";

export type PixiePatchError = {
  code: PixiePatchErrorCode;
  message: string;
  path?: Array<string | number>;
};

export type PixiePatchResult =
  | { ok: true; state: PixieTripState }
  | { ok: false; errors: PixiePatchError[] };

export type PixieReadinessFlags = {
  readyForResortRecommendations: boolean;
  readyForPointEstimates: boolean;
  readyForReadyStayMatching: boolean;
  readyForItinerary: boolean;
  readyForBookingDraft: boolean;
};

export type PixieCompletenessResult = PixieReadinessFlags & {
  score: number;
  planningStage: PixiePlanningStage;
  missingRequired: PixieQuestionKey[];
  missingRecommended: PixieQuestionKey[];
  warnings: string[];
  suggestedNextQuestionKey?: PixieQuestionKey;
};

export type PixieDraftRecoveryReason =
  | "none"
  | "empty"
  | "corrupt_json"
  | "unsupported_draft_version"
  | "invalid_state"
  | "oversized"
  | "migrated";

export type PixieDraftParseResult =
  | { ok: true; state: PixieTripState; recovered: boolean; reason: PixieDraftRecoveryReason }
  | { ok: false; state: PixieTripState; recovered: true; reason: PixieDraftRecoveryReason; errors: string[] };
