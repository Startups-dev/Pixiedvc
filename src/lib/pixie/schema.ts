import { z } from "zod";

import {
  PIXIE_AGE_GROUPS,
  PIXIE_BUDGET_TYPES,
  PIXIE_DESTINATIONS,
  PIXIE_EXPERIENCE_LEVELS,
  PIXIE_LIMITS,
  PIXIE_PLANNING_STAGES,
  PIXIE_PRIORITY_LEVELS,
  PIXIE_QUESTION_KEYS,
  PIXIE_SCHEMA_VERSION,
  PIXIE_SUPPORTED_CURRENCIES,
  PIXIE_TRAVELLER_CATEGORIES,
  PIXIE_VACATION_PACES,
} from "@/lib/pixie/constants";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const localIdPattern = /^[a-zA-Z0-9_-]{1,80}$/;

export const pixieDateOnlySchema = z.string().regex(dateOnlyPattern, "Use YYYY-MM-DD date format.");

const optionalTrimmedString = (max: number = PIXIE_LIMITS.maxShortTextLength) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional();

const nullableTrimmedString = (max: number = PIXIE_LIMITS.maxShortTextLength) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined) return undefined;
      return value.length > 0 ? value : undefined;
    });

const preferenceArraySchema = z
  .array(z.string().trim().max(PIXIE_LIMITS.maxShortTextLength))
  .max(PIXIE_LIMITS.maxPreferencesPerGroup)
  .default([]);

export const pixiePlanningStageSchema = z.enum(PIXIE_PLANNING_STAGES);
export const pixieDestinationSchema = z.enum(PIXIE_DESTINATIONS);
export const pixieQuestionKeySchema = z.enum(PIXIE_QUESTION_KEYS);
export const pixieBudgetTypeSchema = z.enum(PIXIE_BUDGET_TYPES);
export const pixieCurrencySchema = z.enum(PIXIE_SUPPORTED_CURRENCIES);
export const pixieTravellerCategorySchema = z.enum(PIXIE_TRAVELLER_CATEGORIES);
export const pixieAgeGroupSchema = z.enum(PIXIE_AGE_GROUPS);

export const pixieDatesSchema = z
  .object({
    arrivalDate: pixieDateOnlySchema.optional(),
    departureDate: pixieDateOnlySchema.optional(),
    flexibleDates: z.boolean().default(false),
    flexibilityDaysBefore: z.number().int().min(0).max(PIXIE_LIMITS.maxFlexibleDateWindowDays).optional(),
    flexibilityDaysAfter: z.number().int().min(0).max(PIXIE_LIMITS.maxFlexibleDateWindowDays).optional(),
    dateNotes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    numberOfNights: z.number().int().min(1).max(PIXIE_LIMITS.maxTripDurationNights).optional(),
  })
  .strict();

export const pixieTravellerSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    displayName: optionalTrimmedString(),
    label: optionalTrimmedString(),
    category: pixieTravellerCategorySchema.default("unknown"),
    age: z.number().int().min(0).max(120).optional(),
    ageGroup: pixieAgeGroupSchema.optional(),
    interests: z.array(z.string().trim().max(PIXIE_LIMITS.maxShortTextLength)).max(PIXIE_LIMITS.maxTravellerInterests).default([]),
    notes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    accessibilityNeeds: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixiePartySchema = z
  .object({
    adults: z.number().int().min(0).max(PIXIE_LIMITS.maxPartySize).optional(),
    children: z.number().int().min(0).max(PIXIE_LIMITS.maxPartySize).optional(),
    travellers: z.array(pixieTravellerSchema).max(PIXIE_LIMITS.maxTravellers).default([]),
    totalPartySize: z.number().int().min(0).max(PIXIE_LIMITS.maxPartySize).optional(),
    adultCount: z.number().int().min(0).max(PIXIE_LIMITS.maxPartySize).optional(),
    childCount: z.number().int().min(0).max(PIXIE_LIMITS.maxPartySize).optional(),
    ageGroupSummary: z.record(pixieAgeGroupSchema, z.number().int().min(0)).optional(),
    partyNotes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieBudgetSchema = z
  .object({
    amountCents: z.number().int().min(0).optional(),
    currency: pixieCurrencySchema.optional(),
    budgetType: pixieBudgetTypeSchema.default("unknown"),
    notes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixiePreferencesSchema = z
  .object({
    parkPriorities: preferenceArraySchema,
    favoriteCharactersOrThemes: preferenceArraySchema,
    attractionInterests: preferenceArraySchema,
    resortPriorities: preferenceArraySchema,
    preferredResorts: preferenceArraySchema,
    excludedResorts: preferenceArraySchema,
    roomPreferences: preferenceArraySchema,
    transportationPreferences: preferenceArraySchema,
    diningPreferences: preferenceArraySchema,
    vacationPace: z.enum(PIXIE_VACATION_PACES).default("unknown"),
    poolImportance: z.enum(PIXIE_PRIORITY_LEVELS).default("unknown"),
    kitchenImportance: z.enum(PIXIE_PRIORITY_LEVELS).default("unknown"),
    walkingSensitivity: z.enum(PIXIE_PRIORITY_LEVELS).default("unknown"),
    splitStayOpenness: z.boolean().optional(),
    previousDisneyExperience: z.enum(PIXIE_EXPERIENCE_LEVELS).default("unknown"),
    celebrationNotes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    generalNotes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    parkDayIntention: z.boolean().optional(),
  })
  .strict();

export const pixieAccessibilitySchema = z
  .object({
    mobilityConsiderations: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    sensoryConsiderations: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    dietaryConsiderations: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    restFrequencyNeeds: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    strollerOrWheelchairConsiderations: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    planningNotes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

const generatedRecommendationSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(200),
    explanation: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    source: z.enum(["trusted_service", "planner"]).default("trusted_service"),
  })
  .strict();

const pixieFactSourceSchema = z.enum(["system_fact", "user_provided", "inference", "requires_live_verification"]);

const pixiePointBucketSchema = z
  .object({
    points: z.number().int().min(0).max(5000),
    source: pixieFactSourceSchema.default("user_provided"),
    notes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

const pixieDvcContractSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    homeResort: optionalTrimmedString(),
    acquisitionType: z.enum(["direct", "resale", "unknown"]).default("unknown"),
    useYearMonth: z.number().int().min(1).max(12).optional(),
    points: z.number().int().min(0).max(5000).optional(),
    source: pixieFactSourceSchema.default("user_provided"),
    notes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

const pixieDvcPointLotSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    contractId: z.string().trim().regex(localIdPattern).optional(),
    state: z.enum(["current", "banked", "borrowed", "transferred", "holding", "unknown"]).default("unknown"),
    points: z.number().int().min(0).max(5000),
    useYearMonth: z.number().int().min(1).max(12).optional(),
    expirationDate: pixieDateOnlySchema.optional(),
    source: pixieFactSourceSchema.default("user_provided"),
    notes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieDvcContextSchema = z
  .object({
    lodgingContext: z.enum(["dvc_points", "ready_stay", "other", "unknown"]).default("unknown"),
    homeResort: optionalTrimmedString(),
    contracts: z.array(pixieDvcContractSchema).max(8).default([]),
    bookingWindowContext: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    useYear: optionalTrimmedString(40),
    currentUseYearPoints: pixiePointBucketSchema.optional(),
    bankedPoints: pixiePointBucketSchema.optional(),
    borrowedPoints: pixiePointBucketSchema.optional(),
    transferredPoints: pixiePointBucketSchema.optional(),
    nextUseYearPoints: pixiePointBucketSchema.optional(),
    pointLots: z.array(pixieDvcPointLotSchema).max(PIXIE_LIMITS.maxArrayItems).default([]),
    borrowingContemplated: z.boolean().optional(),
    holdingExposure: z
      .object({
        isExposed: z.boolean().optional(),
        source: pixieFactSourceSchema.default("inference"),
        notes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
      })
      .strict()
      .optional(),
    existingReservationSegments: z.array(z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength)).max(PIXIE_LIMITS.maxArrayItems).default([]),
    proposedReservationChanges: z.array(z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength)).max(PIXIE_LIMITS.maxArrayItems).default([]),
    planningRisks: z.array(z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength)).max(PIXIE_LIMITS.maxArrayItems).default([]),
    unresolvedDecisions: z.array(z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength)).max(PIXIE_LIMITS.maxArrayItems).default([]),
  })
  .strict();

const pixieWorkingItineraryAlternativeSchema = z
  .object({
    resort: optionalTrimmedString(),
    roomType: optionalTrimmedString(),
    points: z.number().int().min(0).max(1000).optional(),
    status: z.enum(["planned", "confirmed", "traveler_reported_available", "waitlist_candidate", "unresolved"]).default("planned"),
    rationale: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieWorkingItineraryNightSchema = z
  .object({
    date: pixieDateOnlySchema,
    resort: optionalTrimmedString(),
    roomType: optionalTrimmedString(),
    points: z.number().int().min(0).max(1000).optional(),
    status: z.enum(["planned", "confirmed", "traveler_reported_available", "waitlist_candidate", "unresolved"]).default("planned"),
    alternatives: z.array(pixieWorkingItineraryAlternativeSchema).max(5).default([]),
    rationale: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieAvailabilityObservationSchema = z
  .object({
    date: pixieDateOnlySchema,
    resort: z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength),
    roomType: optionalTrimmedString(),
    points: z.number().int().min(0).max(1000).optional(),
    status: z.enum(["reported_available", "reported_waitlist", "unavailable"]),
    source: z.enum(["traveler_reported", "HannaDVC_verified"]).default("traveler_reported"),
    notes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieActivePlanningDecisionSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    label: z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength),
    currentSecureOption: optionalTrimmedString(),
    potentialBenefit: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    risk: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    status: z.enum(["needs_decision", "needs_account_specific_verification", "resolved"]).default("needs_decision"),
    source: pixieFactSourceSchema.default("user_provided"),
  })
  .strict();

export const pixieWorkspaceDecisionStatusSchema = z.enum(["confirmed", "selected", "planned", "considering", "recommended", "needs_decision", "unknown"]);

export const pixieWorkspaceSourceSchema = z.enum(["explicit_user", "model_recommendation", "deterministic_inference", "live_source", "existing_state"]);

export const pixieWorkspaceTextStatusSchema = pixieWorkspaceDecisionStatusSchema.default("unknown");

export const pixieWorkspaceLodgingPlanSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    resort: z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength),
    startDate: pixieDateOnlySchema.optional(),
    endDate: pixieDateOnlySchema.optional(),
    checkIn: pixieDateOnlySchema.optional(),
    checkOut: pixieDateOnlySchema.optional(),
    status: pixieWorkspaceTextStatusSchema,
    source: pixieWorkspaceSourceSchema.default("deterministic_inference"),
    note: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
    dvcRelevant: z.boolean().optional(),
    roomType: optionalTrimmedString(80),
    numberOfNights: z.number().int().min(1).max(PIXIE_LIMITS.maxTripDurationNights).optional(),
    estimatedPoints: z.number().int().min(0).max(5000).optional(),
    estimatedPointsLow: z.number().int().min(0).max(5000).optional(),
    estimatedPointsHigh: z.number().int().min(0).max(5000).optional(),
    pointsEstimateStatus: z.enum(["estimate", "unsupported", "not_requested"]).optional(),
    estimatedRentalCostCents: z.number().int().min(0).optional(),
    rentalEstimateStatus: z.enum(["estimate", "unsupported", "not_requested"]).optional(),
    estimateNotes: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieWorkspaceParkPlanSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    park: z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength),
    date: pixieDateOnlySchema.optional(),
    status: pixieWorkspaceTextStatusSchema,
    source: pixieWorkspaceSourceSchema.default("deterministic_inference"),
    note: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieWorkspaceDiningPlanSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    restaurant: z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength),
    date: pixieDateOnlySchema.optional(),
    mealPeriod: z.enum(["breakfast", "brunch", "lunch", "dinner", "snack"]).optional(),
    targetTime: optionalTrimmedString(20),
    status: pixieWorkspaceTextStatusSchema,
    source: pixieWorkspaceSourceSchema.default("deterministic_inference"),
    planningPriceEstimate: optionalTrimmedString(120),
    availabilityState: optionalTrimmedString(80),
    note: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieWorkspaceActivityPlanSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    label: z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength),
    date: pixieDateOnlySchema.optional(),
    status: pixieWorkspaceTextStatusSchema,
    source: pixieWorkspaceSourceSchema.default("deterministic_inference"),
    note: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixieWorkspaceAttentionItemSchema = z
  .object({
    id: z.string().trim().regex(localIdPattern),
    label: z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength),
    category: z.enum(["open_decision", "dvc", "live_info", "logistics"]).default("open_decision"),
    status: z.enum(["open", "resolved"]).default("open"),
    source: pixieWorkspaceSourceSchema.default("deterministic_inference"),
    note: optionalTrimmedString(PIXIE_LIMITS.maxNoteLength),
  })
  .strict();

export const pixiePlanningWorkspaceSchema = z
  .object({
    workingItinerary: z.array(pixieWorkingItineraryNightSchema).max(PIXIE_LIMITS.maxTripDurationNights).default([]),
    availabilityObservations: z.array(pixieAvailabilityObservationSchema).max(PIXIE_LIMITS.maxArrayItems).default([]),
    activeDecisions: z.array(pixieActivePlanningDecisionSchema).max(PIXIE_LIMITS.maxArrayItems).default([]),
    lodgingPlans: z.array(pixieWorkspaceLodgingPlanSchema).max(8).default([]),
    parkPlans: z.array(pixieWorkspaceParkPlanSchema).max(PIXIE_LIMITS.maxTripDurationNights + 4).default([]),
    diningPlans: z.array(pixieWorkspaceDiningPlanSchema).max(16).default([]),
    activityPlans: z.array(pixieWorkspaceActivityPlanSchema).max(16).default([]),
    attentionItems: z.array(pixieWorkspaceAttentionItemSchema).max(8).default([]),
  })
  .strict();

export const pixieGeneratedSchema = z
  .object({
    completeness: z.number().int().min(0).max(100).optional(),
    missingInformation: z.array(pixieQuestionKeySchema).max(PIXIE_LIMITS.maxArrayItems).default([]),
    resortRecommendations: z.array(generatedRecommendationSchema).max(PIXIE_LIMITS.maxArrayItems).default([]),
    readyStayMatches: z.array(generatedRecommendationSchema).max(PIXIE_LIMITS.maxArrayItems).default([]),
    itinerary: z.array(z.unknown()).max(PIXIE_LIMITS.maxArrayItems).default([]),
    budgetOverview: z.record(z.unknown()).optional(),
    checklist: z.array(z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength)).max(PIXIE_LIMITS.maxArrayItems).default([]),
    nextActions: z.array(z.string().trim().min(1).max(PIXIE_LIMITS.maxShortTextLength)).max(PIXIE_LIMITS.maxArrayItems).default([]),
    generatedAt: z.string().datetime().optional(),
    planVersion: z.number().int().min(1).default(1),
  })
  .strict();

export const pixieSelectedOptionsSchema = z
  .object({
    selectedResortId: nullableTrimmedString(120),
    selectedResortSlug: nullableTrimmedString(120),
    selectedRoomType: nullableTrimmedString(120),
    selectedReadyStayId: nullableTrimmedString(120),
    selectedRecommendationId: nullableTrimmedString(120),
  })
  .strict();

export const pixieMetadataSchema = z
  .object({
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    source: z.enum(["pixie", "imported_trip_intent", "manual"]).default("pixie"),
    draftId: nullableTrimmedString(120),
    lastInteractionAt: z.string().datetime().optional(),
    affiliate: z
      .object({
        referralCode: nullableTrimmedString(128),
        landingPath: nullableTrimmedString(512),
        visitorId: nullableTrimmedString(128),
        sessionId: nullableTrimmedString(128),
      })
      .strict()
      .optional(),
  })
  .strict();

export const pixieTripStateSchema = z
  .object({
    schemaVersion: z.literal(PIXIE_SCHEMA_VERSION),
    destination: pixieDestinationSchema.default("walt_disney_world"),
    planningStage: pixiePlanningStageSchema.default("new"),
    tripName: optionalTrimmedString(PIXIE_LIMITS.maxShortTextLength),
    dates: pixieDatesSchema.default({}),
    party: pixiePartySchema.default({}),
    budget: pixieBudgetSchema.default({}),
    preferences: pixiePreferencesSchema.default({}),
    accessibility: pixieAccessibilitySchema.default({}),
    dvcContext: pixieDvcContextSchema.default({}),
    planningWorkspace: pixiePlanningWorkspaceSchema.default({}),
    generated: pixieGeneratedSchema.default({}),
    selectedOptions: pixieSelectedOptionsSchema.default({}),
    metadata: pixieMetadataSchema.default({}),
  })
  .strict()
  .superRefine((state, ctx) => {
    const adults = state.party.adults ?? 0;
    const children = state.party.children ?? 0;
    const totalPartySize = state.party.totalPartySize ?? adults + children;
    if (totalPartySize > PIXIE_LIMITS.maxPartySize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["party", "totalPartySize"],
        message: `Party size cannot exceed ${PIXIE_LIMITS.maxPartySize}.`,
      });
    }
  });

export const travellerAddOperationSchema = z
  .object({
    op: z.literal("addTraveller"),
    traveller: pixieTravellerSchema.omit({ id: true }).extend({ id: z.string().trim().regex(localIdPattern).optional() }).strict(),
  })
  .strict();

export const travellerUpdateOperationSchema = z
  .object({
    op: z.literal("updateTraveller"),
    id: z.string().trim().regex(localIdPattern),
    changes: pixieTravellerSchema.omit({ id: true }).partial().strict(),
  })
  .strict();

export const travellerRemoveOperationSchema = z
  .object({
    op: z.literal("removeTraveller"),
    id: z.string().trim().regex(localIdPattern),
  })
  .strict();

export const pixieTravellerOperationSchema = z.discriminatedUnion("op", [
  travellerAddOperationSchema,
  travellerUpdateOperationSchema,
  travellerRemoveOperationSchema,
]);

export const pixieDatesPatchSchema = pixieDatesSchema
  .omit({ numberOfNights: true })
  .partial()
  .strict();

export const pixiePartyPatchSchema = pixiePartySchema
  .omit({ travellers: true, totalPartySize: true, adultCount: true, childCount: true, ageGroupSummary: true })
  .partial()
  .extend({
    travellerOperations: z.array(pixieTravellerOperationSchema).max(PIXIE_LIMITS.maxArrayItems).optional(),
  })
  .strict();

export const pixieTripPatchSchema = z
  .object({
    destination: pixieDestinationSchema.optional(),
    tripName: nullableTrimmedString(PIXIE_LIMITS.maxShortTextLength),
    dates: pixieDatesPatchSchema.optional(),
    party: pixiePartyPatchSchema.optional(),
    budget: pixieBudgetSchema.partial().strict().optional(),
    preferences: pixiePreferencesSchema.partial().strict().optional(),
    accessibility: pixieAccessibilitySchema.partial().strict().optional(),
    dvcContext: pixieDvcContextSchema.partial().strict().optional(),
    planningWorkspace: pixiePlanningWorkspaceSchema.partial().strict().optional(),
    selectedOptions: pixieSelectedOptionsSchema.partial().strict().optional(),
    metadata: pixieMetadataSchema.pick({ source: true, affiliate: true, draftId: true, lastInteractionAt: true }).partial().strict().optional(),
  })
  .strict();

export type PixieTripState = z.infer<typeof pixieTripStateSchema>;
export type PixieTripPatch = z.infer<typeof pixieTripPatchSchema>;
export type PixieTraveller = z.infer<typeof pixieTravellerSchema>;
export type PixieTravellerOperation = z.infer<typeof pixieTravellerOperationSchema>;
export type PixiePlanningStage = z.infer<typeof pixiePlanningStageSchema>;
export type PixieQuestionKey = z.infer<typeof pixieQuestionKeySchema>;
export type PixieDestination = z.infer<typeof pixieDestinationSchema>;
