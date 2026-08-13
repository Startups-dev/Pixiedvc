import { describe, expect, it } from "vitest";

import { detectHannaKnowledgeIntent, resolveHannaEntities } from "@/lib/pixie/knowledge";
import { HANNA_V1_AREAS, HANNA_V1_ATTRACTIONS, HANNA_V1_DINING, HANNA_V1_ENTERTAINMENT, HANNA_V1_PARKS } from "@/lib/pixie/knowledge/catalog/static-v1";
import { createHannaKnowledgeService } from "@/lib/pixie/knowledge/retrieval";
import { createStaticHannaKnowledgeRepository } from "@/lib/pixie/knowledge/repository";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";

describe("Hanna Disney knowledge V1", () => {
  const repository = createStaticHannaKnowledgeRepository();
  const service = createHannaKnowledgeService(repository);

  it("resolves common BoardWalk and EPCOT references deterministically", () => {
    const entities = resolveHannaEntities("We're staying at BWV near EPCOT.", repository);
    expect(entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "resort_boardwalk_villas", entityType: "resort" }),
        expect.objectContaining({ id: "park_epcot", entityType: "park" }),
      ]),
    );
  });

  it("detects dining, toddler, park, resort, and geography context for the proof case", () => {
    const intent = detectHannaKnowledgeIntent(
      "We're staying at BoardWalk and going to EPCOT. Give me 5 actual restaurants for dinner with our 2-year-old.",
    );

    expect(intent.domains).toEqual(expect.arrayContaining(["dining", "park", "resort", "family", "geography"]));
    expect(intent.toddlerContext).toBe(true);
    expect(intent.mealPeriod).toBe("dinner");
  });

  it("retrieves bounded relevant EPCOT dining candidates and Hanna planning signals", () => {
    const context = service.retrieve({
      latestUserMessage:
        "We're staying at BoardWalk and going to EPCOT. Give me 5 actual restaurants you would consider for dinner, tell me where each one is, what kind of food it serves, roughly what dinner costs, and which one you'd pick for us with a 2 year old.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      maxCandidates: 8,
      maxSignals: 4,
    });

    const candidateIds = context.candidates.map((candidate) => candidate.id);
    expect(context.domains).toEqual(expect.arrayContaining(["dining", "family"]));
    expect(context.resolvedEntities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "resort_boardwalk_villas" }),
        expect.objectContaining({ id: "park_epcot" }),
      ]),
    );
    expect(context.candidates.length).toBeLessThanOrEqual(8);
    expect(candidateIds).toEqual(
      expect.arrayContaining([
        "dining_via_napoli",
        "dining_garden_grill",
        "dining_biergarten",
      ]),
    );
    expect(candidateIds.filter((id) => id.startsWith("dining_")).length).toBeGreaterThanOrEqual(5);
    expect(context.candidates.slice(0, 5).every((candidate) => candidate.locationName?.includes("EPCOT") || candidate.tags?.includes("epcot"))).toBe(true);
    expect(candidateIds.slice(0, 5).every((id) => ["dining_crystal_palace", "dining_liberty_tree_tavern"].includes(id))).toBe(false);
    expect(context.planningSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "signal_boardwalk_epcot_gateway" }),
      ]),
    );
    expect(context.planningSignals.some((signal) => signal.contexts.includes("toddler") && signal.contexts.includes("dining"))).toBe(true);
    expect(context.liveGaps).toEqual([]);
    expect(context.candidates.find((candidate) => candidate.id === "dining_via_napoli")).toMatchObject({
      costTier: "moderate",
      costFreshness: "refreshable",
      geographicRelationship: "exact_location",
    });
  });

  it("marks reservation availability as live while still retrieving stable restaurant knowledge", () => {
    const context = service.retrieve({
      latestUserMessage: "Can I get Via Napoli at 6 PM September 2?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.resolvedEntities).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_via_napoli" })]));
    expect(context.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_via_napoli" })]));
    expect(context.liveGaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "dining_reservation_availability",
          entityId: "dining_via_napoli",
        }),
      ]),
    );
    expect(JSON.stringify(context)).not.toMatch(/available at 6|reservation confirmed|booked/i);
  });

  it("Case A ranks inside-EPCOT dinner above nearby BoardWalk-area dining", () => {
    const context = service.retrieve({
      latestUserMessage: "We're staying at BoardWalk and going to EPCOT. Give me 5 restaurants in EPCOT for dinner with our 2-year-old.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      maxCandidates: 5,
    });

    expect(context.candidates).toHaveLength(5);
    expect(context.candidates.every((candidate) => candidate.geographicRelationship === "exact_location")).toBe(true);
    expect(context.candidates.map((candidate) => candidate.id)).toEqual(expect.arrayContaining(["dining_via_napoli", "dining_garden_grill"]));
    expect(context.candidates.map((candidate) => candidate.id)).not.toContain("dining_trattoria_al_forno");
  });

  it("Case B allows directly connected BoardWalk-area dining when nearby options are requested", () => {
    const context = service.retrieve({
      latestUserMessage: "We're staying at BoardWalk. Give me good dinner options at EPCOT or nearby.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates.map((candidate) => candidate.geographicRelationship)).toContain("exact_location");
    expect(context.candidates.map((candidate) => candidate.geographicRelationship)).toContain("directly_connected");
    expect(context.candidates.some((candidate) => candidate.tags?.includes("epcot_resort_area") || candidate.tags?.includes("boardwalk"))).toBe(true);
  });

  it("Case C lets explicit Magic Kingdom intent override EPCOT-heavy trip state", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      preferences: {
        parkPriorities: ["EPCOT"],
        preferredResorts: ["BoardWalk Villas"],
      },
    });
    const context = service.retrieve({
      latestUserMessage: "Give me restaurants inside Magic Kingdom.",
      currentState: state,
    });

    expect(context.resolvedEntities).toEqual(expect.arrayContaining([expect.objectContaining({ id: "park_magic_kingdom" })]));
    expect(context.candidates.map((candidate) => candidate.id)).toEqual(expect.arrayContaining(["dining_be_our_guest", "dining_liberty_tree_tavern"]));
    expect(context.candidates.map((candidate) => candidate.id)).not.toContain("dining_via_napoli");
  });

  it("Case D suppresses expensive dining when the user excludes it", () => {
    const context = service.retrieve({
      latestUserMessage: "Give me inexpensive dinner options. Nothing expensive.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates.length).toBeGreaterThan(0);
    expect(context.candidates.every((candidate) => candidate.costTier !== "expensive" && candidate.costTier !== "premium")).toBe(true);
  });

  it("prioritizes matching dining type and meal period for character breakfast", () => {
    const context = service.retrieve({
      latestUserMessage: "Give me character breakfast options.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates.length).toBeGreaterThan(0);
    expect(context.candidates.every((candidate) => candidate.serviceType === "character_dining" || candidate.tags?.includes("character_breakfast"))).toBe(true);
    expect(context.candidates.every((candidate) => candidate.mealPeriods?.includes("breakfast"))).toBe(true);
  });

  it("suppresses character dining when explicitly excluded", () => {
    const context = service.retrieve({
      latestUserMessage: "Give me a family dinner but not character dining.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates.length).toBeGreaterThan(0);
    expect(context.candidates.every((candidate) => candidate.serviceType !== "character_dining" && !candidate.tags?.includes("character_dining"))).toBe(true);
  });

  it("prioritizes quick-service candidates for an Animal Kingdom quick lunch", () => {
    const context = service.retrieve({
      latestUserMessage: "We want a quick lunch at Animal Kingdom.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates.length).toBeGreaterThan(0);
    expect(context.candidates.every((candidate) => candidate.serviceType === "quick_service")).toBe(true);
    expect(context.candidates.map((candidate) => candidate.id)).toEqual(expect.arrayContaining(["dining_satuli_canteen", "dining_flame_tree_bbq"]));
  });

  it("retrieves both sides for named dining comparison with toddler context", () => {
    const context = service.retrieve({
      latestUserMessage: "Via Napoli or Biergarten with our 2-year-old?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dining_via_napoli", comparisonGroup: "comparison_option", toddlerFit: "strong" }),
        expect.objectContaining({ id: "dining_biergarten", comparisonGroup: "comparison_option", toddlerFit: "good" }),
      ]),
    );
  });

  it("marks current menu item questions as live-required while resolving the restaurant", () => {
    const context = service.retrieve({
      latestUserMessage: "Does Garden Grill have mac and cheese right now?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.resolvedEntities).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_garden_grill" })]));
    expect(context.liveGaps).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "current_menu", entityId: "dining_garden_grill" })]));
  });

  it("does not let toddler dining fit dominate adults-only EPCOT dinner", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      party: { adults: 2, children: 0 },
    });
    const context = service.retrieve({
      latestUserMessage: "Two adults, no kids. Give us a nice EPCOT dinner.",
      currentState: state,
    });

    expect(context.candidates.map((candidate) => candidate.id)).toEqual(expect.arrayContaining(["dining_le_cellier", "dining_monsieur_paul"]));
    expect(context.planningSignals.map((signal) => signal.id)).not.toContain("signal_lively_dining_toddler");
  });

  it("Case E retrieves both comparison sides and EPCOT toddler planning context", () => {
    const context = service.retrieve({
      latestUserMessage: "BoardWalk or Saratoga for an EPCOT day with our 2-year-old?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "resort_boardwalk_villas", comparisonGroup: "comparison_option" }),
        expect.objectContaining({ id: "resort_saratoga_springs", comparisonGroup: "comparison_option" }),
      ]),
    );
    expect(context.planningSignals).toEqual(expect.arrayContaining([expect.objectContaining({ id: "signal_boardwalk_epcot_gateway" })]));
  });

  it("Case F ranks the late-night toddler Magic Kingdom walking signal for BLT comparisons", () => {
    const context = service.retrieve({
      latestUserMessage: "We're doing a late Magic Kingdom party with our 2-year-old. BLT or Saratoga?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "resort_bay_lake_tower", comparisonGroup: "comparison_option" }),
        expect.objectContaining({ id: "resort_saratoga_springs", comparisonGroup: "comparison_option" }),
      ]),
    );
    expect(context.planningSignals[0]).toEqual(expect.objectContaining({ id: "signal_late_mk_walk" }));
  });

  it("Case G preserves stable restaurant retrieval while marking reservation availability live", () => {
    const context = service.retrieve({
      latestUserMessage: "Is Via Napoli good for our 2-year-old and can I get a table at 6 PM September 2?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_via_napoli", toddlerFit: "strong" })]));
    expect(context.liveGaps).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "dining_reservation_availability", entityId: "dining_via_napoli" })]));
  });

  it("Case H keeps broad refreshable cost tier while marking exact current pricing live", () => {
    const context = service.retrieve({
      latestUserMessage: "Exactly how much is dinner at Via Napoli right now?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_via_napoli", costTier: "moderate", costFreshness: "refreshable" })]));
    expect(context.liveGaps).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "current_menu_prices", entityId: "dining_via_napoli" })]));
  });

  it("Case I resolves expanded catalog restaurants instead of treating them as absent V1 entities", () => {
    const context = service.retrieve({
      latestUserMessage: "Tell me about Teppan Edo for dinner.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.resolvedEntities).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_teppan_edo" })]));
    expect(context.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dining_teppan_edo", cuisine: expect.stringMatching(/Japanese/i) })]));
    expect(context.knowledgeGaps).toEqual([]);
  });

  it("Case J enforces hard provider-facing retrieval bounds", () => {
    const context = service.retrieve({
      latestUserMessage: "Give me Disney World dining ideas.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      maxCandidates: 50,
      maxSignals: 20,
    });

    expect(context.candidates.length).toBeLessThanOrEqual(8);
    expect(context.planningSignals.length).toBeLessThanOrEqual(3);
  });

  it("uses recent user context for natural follow-up filtering without storing another memory layer", () => {
    const context = service.retrieve({
      latestUserMessage: "Forget the expensive ones. Which two would you keep?",
      recentMessages: [
        {
          role: "user",
          content: "Give me five EPCOT restaurants for dinner with our 2-year-old.",
        },
      ],
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      maxCandidates: 2,
    });

    expect(context.resolvedEntities).toEqual(expect.arrayContaining([expect.objectContaining({ id: "park_epcot" })]));
    expect(context.candidates).toHaveLength(2);
    expect(context.candidates.every((candidate) => candidate.costTier !== "expensive" && candidate.costTier !== "premium")).toBe(true);
    expect(context.candidates.every((candidate) => candidate.geographicRelationship === "exact_location")).toBe(true);
  });

  it("does not return toddler planning signals for adults-only EPCOT breakfast", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      party: { adults: 2, children: 0 },
    });
    const context = service.retrieve({
      latestUserMessage: "Where should two adults have breakfast at EPCOT?",
      currentState: state,
    });

    expect(context.planningSignals.map((signal) => signal.id)).not.toContain("signal_lively_dining_toddler");
    expect(context.planningSignals.map((signal) => signal.id)).not.toContain("signal_boardwalk_epcot_gateway");
  });

  it("has expanded four-park area, attraction, and entertainment coverage", () => {
    expect(HANNA_V1_PARKS).toHaveLength(4);
    expect(HANNA_V1_AREAS.length).toBeGreaterThanOrEqual(30);
    expect(HANNA_V1_DINING.length).toBeGreaterThanOrEqual(90);
    expect(HANNA_V1_DINING.length).toBeLessThanOrEqual(120);
    expect(HANNA_V1_ATTRACTIONS.length).toBeGreaterThanOrEqual(50);
    expect(HANNA_V1_ENTERTAINMENT.length).toBeGreaterThanOrEqual(8);
  });

  it("Case A returns toddler-appropriate Magic Kingdom attractions without toddler-ineligible thrill rides dominating", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      party: { adults: 2, children: 1, travellers: [{ id: "helena", category: "child", age: 2 }] },
    });
    const context = service.retrieve({
      latestUserMessage: "What should we do at Magic Kingdom with our 2-year-old?",
      currentState: state,
    });

    const ids = context.candidates.map((candidate) => candidate.id);
    expect(ids).toEqual(expect.arrayContaining(["attr_mk_small_world", "attr_mk_winnie_pooh", "attr_mk_little_mermaid"]));
    expect(ids.slice(0, 5)).not.toEqual(expect.arrayContaining(["attr_mk_space_mountain", "attr_mk_tron"]));
  });

  it("Case B filters Magic Kingdom attractions by a 35-inch child height and does not treat unknown as eligible", () => {
    const context = service.retrieve({
      latestUserMessage: "My daughter is 35 inches tall. What can she ride at Magic Kingdom?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    const ids = context.candidates.map((candidate) => candidate.id);
    expect(ids).toContain("attr_mk_barnstormer");
    expect(ids).toContain("attr_mk_small_world");
    expect(ids).not.toContain("attr_mk_seven_dwarfs");
    expect(ids).not.toContain("attr_mk_space_mountain");
    expect(context.candidates.every((candidate) => candidate.heightRequirement?.kind !== "unknown")).toBe(true);
  });

  it("Case C prioritizes Fantasyland geography for nearby things", () => {
    const context = service.retrieve({
      latestUserMessage: "We're in Fantasyland. Give me three nearby things to do.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      maxCandidates: 3,
    });

    expect(context.candidates).toHaveLength(3);
    expect(context.candidates.every((candidate) => candidate.locationName === "Fantasyland")).toBe(true);
  });

  it("Case D retrieves EPCOT cool-down options for supplied heat context", () => {
    const context = service.retrieve({
      latestUserMessage: "We're at EPCOT and need to cool down for a while.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "attr_epcot_living_land", indoorOutdoor: "indoor" }),
        expect.objectContaining({ id: "attr_epcot_nemo", indoorOutdoor: "indoor" }),
      ]),
    );
    expect(context.planningSignals).toEqual(expect.arrayContaining([expect.objectContaining({ id: "signal_heat_indoor_reset" })]));
  });

  it("Case E retrieves indoor Hollywood Studios options for user-supplied rain context", () => {
    const context = service.retrieve({
      latestUserMessage: "It's raining at Hollywood Studios. What should we do?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates.map((candidate) => candidate.id)).toEqual(expect.arrayContaining(["attr_hs_runaway_railway", "attr_hs_toy_story_mania", "attr_hs_muppetvision"]));
    expect(context.candidates.every((candidate) => candidate.indoorOutdoor !== "outdoor")).toBe(true);
  });

  it("Case F retrieves Safari and planning judgment without live wait or animal guarantees", () => {
    const context = service.retrieve({
      latestUserMessage: "Should we do Kilimanjaro Safaris first thing?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates[0]).toEqual(expect.objectContaining({ id: "attr_ak_safari" }));
    expect(context.planningSignals).toEqual(expect.arrayContaining([expect.objectContaining({ id: "signal_safari_morning_not_guarantee" })]));
    expect(context.liveGaps).toEqual([]);
    expect(JSON.stringify(context)).not.toMatch(/\b\d+\s*minute wait|guaranteed animal activity/i);
  });

  it("Case G retrieves lower-energy Magic Kingdom options after a missed nap", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      party: { adults: 2, children: 1, travellers: [{ id: "helena", category: "child", age: 2 }] },
    });
    const context = service.retrieve({
      latestUserMessage: "She missed her nap and we're at Magic Kingdom. What would you do?",
      currentState: state,
    });

    expect(context.candidates.map((candidate) => candidate.id)).toEqual(expect.arrayContaining(["support_mk_baby_care", "attr_mk_small_world"]));
    expect(context.planningSignals).toEqual(expect.arrayContaining([expect.objectContaining({ id: "signal_missed_nap_lower_energy" })]));
  });

  it("Case H retrieves Animal Kingdom toddler entertainment and marks exact showtime as live when requested", () => {
    const context = service.retrieve({
      latestUserMessage: "What's a good show at Animal Kingdom for a toddler, and what time is it today?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "ent_ak_lion_king", entityType: "entertainment" })]));
    expect(context.liveGaps).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "showtimes" })]));
  });

  it("Case I resolves Slinky Dog but marks current wait time live-required", () => {
    const context = service.retrieve({
      latestUserMessage: "What's the wait for Slinky Dog right now?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.resolvedEntities).toEqual(expect.arrayContaining([expect.objectContaining({ id: "attr_hs_slinky_dog" })]));
    expect(context.candidates).toEqual(expect.arrayContaining([expect.objectContaining({ id: "attr_hs_slinky_dog" })]));
    expect(context.liveGaps).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "current_wait_time", entityId: "attr_hs_slinky_dog" })]));
  });

  it("Case J returns bounded EPCOT toddler priorities for limited time", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      party: { adults: 2, children: 1, travellers: [{ id: "helena", category: "child", age: 2 }] },
    });
    const context = service.retrieve({
      latestUserMessage: "We only have three hours at EPCOT. What would you prioritize with our toddler?",
      currentState: state,
    });

    expect(context.candidates.length).toBeLessThanOrEqual(8);
    expect(context.candidates.map((candidate) => candidate.id)).toEqual(expect.arrayContaining(["attr_epcot_nemo", "attr_epcot_living_land", "attr_epcot_gran_fiesta"]));
    expect(context.planningSignals).toEqual(expect.arrayContaining([expect.objectContaining({ id: "signal_epcot_three_hours_toddler" })]));
  });

  it("Case K does not let toddler signals dominate adults-only EPCOT priorities", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      party: { adults: 2, children: 0 },
    });
    const context = service.retrieve({
      latestUserMessage: "What should we prioritize at EPCOT?",
      currentState: state,
    });

    expect(context.planningSignals.map((signal) => signal.id)).not.toContain("signal_epcot_three_hours_toddler");
    expect(context.candidates.map((candidate) => candidate.id)).toEqual(expect.arrayContaining(["attr_epcot_guardians", "attr_epcot_remy"]));
  });

  it("Case L returns small nearby World Showcase discovery context", () => {
    const context = service.retrieve({
      latestUserMessage: "We have 30 minutes before dinner in World Showcase. Anything neat nearby?",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
    });

    expect(context.candidates.length).toBeLessThanOrEqual(8);
    expect(context.candidates.map((candidate) => candidate.id)).toContain("attr_epcot_gran_fiesta");
    expect(context.planningSignals).toEqual(expect.arrayContaining([expect.objectContaining({ id: "signal_world_showcase_discovery" })]));
  });

  it("prioritizes Disney-specific discovery context for surprise requests", () => {
    const context = service.retrieve({
      latestUserMessage: "We're at Magic Kingdom with our 2-year-old. Surprise me with one thing you think we'd love that I probably haven't thought of.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      maxCandidates: 5,
      maxSignals: 3,
    });

    expect(context.domains).toEqual(expect.arrayContaining(["discovery", "park", "family"]));
    expect(context.candidates.length + context.planningSignals.length).toBeGreaterThan(0);
    expect(
      context.candidates.some((candidate) => ["attraction", "entertainment", "support"].includes(candidate.entityType)) ||
        context.planningSignals.some((signal) => signal.contexts.includes("magic_kingdom") || signal.contexts.includes("toddler")),
    ).toBe(true);
  });

  it("Case M keeps broad attraction retrieval within hard bounds", () => {
    const context = service.retrieve({
      latestUserMessage: "Give me attraction ideas across Disney World.",
      currentState: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      maxCandidates: 100,
      maxSignals: 100,
    });

    expect(context.candidates.length).toBeLessThanOrEqual(8);
    expect(context.planningSignals.length).toBeLessThanOrEqual(3);
  });
});
