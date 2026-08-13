import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PixieAiException } from "@/lib/pixie/ai/errors";
import { createFixturePixieProvider, type PixieModelOptions, type PixiePlannerTurnInput } from "@/lib/pixie/ai/provider";
import { runPixiePlannerTurn, streamPixiePlannerTurn } from "@/lib/pixie/ai/orchestrator";
import { createFakeLiveDisneyProvider, createLiveDisneyService } from "@/lib/pixie/live";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";

describe("Pixie AI orchestrator", () => {
  const originalPixieModel = process.env.PIXIE_MODEL;

  beforeEach(() => {
    process.env.PIXIE_MODEL = "gpt-5.6-sol";
  });

  afterEach(() => {
    if (originalPixieModel === undefined) delete process.env.PIXIE_MODEL;
    else process.env.PIXIE_MODEL = originalPixieModel;
  });

  function successfulProvider(onCall?: (input: PixiePlannerTurnInput, options?: PixieModelOptions) => void) {
    return {
      async createPlannerTurn(input: PixiePlannerTurnInput, options?: PixieModelOptions) {
        onCall?.(input, options);
        return {
          result: {
            assistantResponse: "I can work with those details.",
            tripPatch: {},
            requestedTools: [],
            planningIntent: "update_trip" as const,
            confidence: 0.8,
            warnings: [],
          },
          metadata: {
            provider: "fixture",
            model: "fixture-model",
            promptVersion: "fixture-prompt",
            sourceVersion: "fixture",
          },
          usage: {
            provider: "fixture",
            model: "fixture-model",
            promptVersion: "fixture-prompt",
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          },
        };
      },
    };
  }

  it("applies dates and party from a structured model patch", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-07-11T12:00:00.000Z"),
      message: "We are going September 7 to 12 with two adults and two kids.",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "Great, I added your dates and party.",
          tripPatch: {
            dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
            party: { adults: 2, children: 2 },
            preferences: { resortPriorities: ["family friendly"] },
          },
          requestedTools: ["get_planner_status"].map((name) => ({ name: name as "get_planner_status", input: {} })),
          nextQuestionKey: "ask_budget_context",
          planningIntent: "update_trip",
          confidence: 0.8,
          warnings: [],
        },
      }),
      now: "2026-07-11T12:01:00.000Z",
    });
    expect(result.updatedState.dates.numberOfNights).toBe(5);
    expect(result.updatedState.party.totalPartySize).toBe(4);
    expect(result.toolResults.some((tool) => tool.toolName === "get_planner_status")).toBe(true);
  });

  it("invalid model patch preserves previous state and returns warning", async () => {
    const state = createEmptyPixieTripState("2026-07-11T12:00:00.000Z");
    const result = await runPixiePlannerTurn({
      state,
      message: "We depart before we arrive.",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "I need to clarify your dates.",
          tripPatch: { dates: { arrivalDate: "2027-09-12", departureDate: "2027-09-07" } },
          requestedTools: [],
          nextQuestionKey: "ask_dates",
          planningIntent: "clarify_information",
          confidence: 0.4,
          warnings: [],
        },
      }),
      now: "2026-07-11T12:01:00.000Z",
    });
    expect(result.updatedState.dates.arrivalDate).toBeUndefined();
    expect(result.warnings.join(" ")).toMatch(/Patch rejected/);
  });

  it("recommendation-ready state calls deterministic resort recommendations", async () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-07-11T12:00:00.000Z"),
      dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
      party: { adults: 2, children: 2 },
      preferences: { resortPriorities: ["monorail"], parkPriorities: ["Magic Kingdom"] },
    });
    const result = await runPixiePlannerTurn({
      state,
      message: "What resorts fit?",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "I’ll compare trusted resort options.",
          tripPatch: {},
          requestedTools: [{ name: "recommend_resorts", input: {} }],
          planningIntent: "recommend_resorts",
          confidence: 0.8,
          warnings: [],
        },
      }),
      now: "2026-07-11T12:01:00.000Z",
    });
    expect(result.recommendations?.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations?.recommendations[0].score).toBeTypeOf("number");
  });

  it("golden Portuguese Magic Kingdom party scenario keeps BLT first for easiest return", async () => {
    const first = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      message: "Eu vou para a Disney no dia 1 de setembro de 2026. Serão eu, meu marido e minha filha de 2 anos. Qual o resort mais apropriado?",
      provider: successfulProvider(),
      now: "2026-08-13T12:01:00.000Z",
    });
    const second = await runPixiePlannerTurn({
      state: first.updatedState,
      message: "Pagaremos mais. Vamos à festa de Halloween no Magic Kingdom no dia 1.",
      provider: successfulProvider(),
      now: "2026-08-13T12:02:00.000Z",
    });
    const final = await runPixiePlannerTurn({
      state: second.updatedState,
      message: "Qual o resort mais fácil para voltar depois da festa?",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "Para essa viagem, eu escolheria o Bay Lake Tower.",
          tripPatch: {},
          requestedTools: [{ name: "recommend_resorts", input: {} }],
          planningIntent: "recommend_resorts",
          conversationMode: "decision_support",
          activeDecisionKey: "resort_choice",
          confidence: 0.9,
          warnings: [],
        },
      }),
      now: "2026-08-13T12:03:00.000Z",
    });

    expect(final.updatedState.party.adultCount).toBe(2);
    expect(final.updatedState.party.childCount).toBe(1);
    expect(final.updatedState.party.travellers[0]?.ageGroup).toBe("preschooler");
    expect(final.updatedState.preferences.parkPriorities).toContain("Magic Kingdom");
    expect(final.updatedState.preferences.resortPriorities).toEqual(expect.arrayContaining(["dominant Magic Kingdom return convenience", "walking access after Magic Kingdom party"]));
    expect(final.recommendations?.recommendations[0]).toMatchObject({ resortId: "blt" });
    expect(final.recommendations?.recommendations[0].reasonCodes).toContain("dominant_mk_return_convenience");
    expect(final.recommendations?.recommendations[0].resortId).not.toBe("akv");
  });

  it("latest Magic Kingdom return preference overrides stale Animal Kingdom preference", async () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      dates: { arrivalDate: "2026-09-01", departureDate: "2026-09-06" },
      party: { adults: 2, children: 1, travellers: [{ id: "daughter", category: "child", age: 2 }] },
      preferences: { preferredResorts: ["Animal Kingdom Villas"], resortPriorities: ["savanna", "dominant Magic Kingdom return convenience", "walking access after Magic Kingdom party"], parkPriorities: ["Magic Kingdom"] },
    });
    const result = await runPixiePlannerTurn({
      state,
      message: "Qual o resort mais fácil para voltar depois da festa?",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "Bay Lake Tower é a escolha prática aqui.",
          tripPatch: {},
          requestedTools: [{ name: "recommend_resorts", input: {} }],
          planningIntent: "recommend_resorts",
          conversationMode: "decision_support",
          activeDecisionKey: "resort_choice",
          confidence: 0.9,
          warnings: [],
        },
      }),
      now: "2026-08-13T12:03:00.000Z",
    });

    expect(result.recommendations?.recommendations[0].resortId).toBe("blt");
  });

  it("does not call resort recommendations for a narrow DVC cancellation question", async () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      dates: { arrivalDate: "2026-09-01", departureDate: "2026-09-06" },
      party: { adults: 2, children: 1 },
      preferences: { resortPriorities: ["monorail"], parkPriorities: ["Magic Kingdom"] },
    });
    const result = await runPixiePlannerTurn({
      state,
      message: "How will I cancel Saratoga? Won't we be in the non-cancelling window soon?",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "You are right to check the cancellation window before changing Saratoga.",
          tripPatch: {},
          requestedTools: [{ name: "recommend_resorts", input: {} }],
          planningIntent: "revise_plan",
          conversationMode: "decision_support",
          activeDecisionKey: "resort_choice",
          confidence: 0.8,
          warnings: [],
        },
      }),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.toolResults.some((tool) => tool.toolName === "recommend_resorts")).toBe(false);
    expect(result.recommendations).toBeUndefined();
    expect(result.assistantResponse).toMatch(/^You are right to check/);
  });

  it("passes compact Hanna knowledge context to the provider after lightweight extraction", async () => {
    let providerInput: PixiePlannerTurnInput | undefined;
    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-12T12:00:00.000Z"),
      message:
        "We're staying at BoardWalk and going to EPCOT. Give me 5 actual restaurants for dinner with our 2 year old.",
      provider: successfulProvider((input) => {
        providerInput = input;
      }),
      now: "2026-08-12T12:01:00.000Z",
    });

    expect(providerInput?.knowledgeContext?.domains).toEqual(expect.arrayContaining(["dining", "family"]));
    expect(providerInput?.knowledgeContext?.resolvedEntities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "resort_boardwalk_villas" }),
        expect.objectContaining({ id: "park_epcot" }),
      ]),
    );
    expect(providerInput?.knowledgeContext?.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dining_via_napoli" }),
        expect.objectContaining({ id: "dining_garden_grill" }),
      ]),
    );
    expect(providerInput?.knowledgeContext?.candidates.length).toBeLessThanOrEqual(8);
  });

  it("retrieves live park hours before provider invocation when the turn asks for current hours", async () => {
    const liveProvider = createFakeLiveDisneyProvider();
    liveProvider.setParkHours("park_magic_kingdom", "2026-09-02", { openTime: "09:00", closeTime: "22:00" });
    let providerInput: PixiePlannerTurnInput | undefined;

    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-13T14:00:00.000Z"),
      message: "What time does Magic Kingdom close September 2?",
      provider: successfulProvider((input) => {
        providerInput = input;
      }),
      liveDisneyService: createLiveDisneyService({ provider: liveProvider }),
      now: "2026-08-13T14:00:00.000Z",
    });

    expect(providerInput?.liveContext?.parkHours[0]).toMatchObject({
      park: { id: "park_magic_kingdom" },
      date: "2026-09-02",
      closeTime: "22:00",
    });
  });

  it("golden workspace scenario promotes decisions without false confirmations or duplicate dining", async () => {
    let state = createEmptyPixieTripState("2026-08-13T12:00:00.000Z");
    const provider = successfulProvider();
    const turn = async (message: string) => {
      const result = await runPixiePlannerTurn({ state, message, provider, now: "2026-08-13T12:00:00.000Z" });
      state = result.updatedState;
      return result;
    };

    await turn("We're going August 29 to September 5 with our 2-year-old.");
    expect(state.party.adults).toBe(2);
    expect(state.party.children).toBe(1);
    expect(state.party.travellers[0]?.age).toBe(2);
    expect(state.dates.arrivalDate).toBe("2026-08-29");
    expect(state.dates.departureDate).toBe("2026-09-05");
    expect(state.planningWorkspace.lodgingPlans).toHaveLength(0);

    await turn("We're considering Animal Kingdom Villas but we'll be at the Magic Kingdom Halloween party and want the easiest trip back.");
    expect(state.planningWorkspace.lodgingPlans).toEqual(expect.arrayContaining([expect.objectContaining({ resort: "Animal Kingdom Villas", status: "considering" })]));
    expect(state.planningWorkspace.activityPlans).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Magic Kingdom Halloween party" })]));
    expect(state.planningWorkspace.lodgingPlans.some((plan) => plan.status === "confirmed")).toBe(false);

    await turn("Bay Lake sounds much better. Let's do that.");
    expect(state.planningWorkspace.lodgingPlans).toEqual(expect.arrayContaining([expect.objectContaining({ resort: "Bay Lake Tower", status: "selected" })]));
    expect(state.planningWorkspace.lodgingPlans.find((plan) => plan.resort === "Bay Lake Tower")?.status).not.toBe("confirmed");

    await turn("We'll do EPCOT September 3. Find us dinner around 6.");
    expect(state.planningWorkspace.parkPlans).toEqual(expect.arrayContaining([expect.objectContaining({ park: "EPCOT", date: "2026-09-03", status: "planned" })]));
    expect(state.planningWorkspace.attentionItems).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Choose dinner" })]));

    await turn("Via Napoli sounds perfect.");
    expect(state.planningWorkspace.diningPlans).toEqual(expect.arrayContaining([expect.objectContaining({ restaurant: "Via Napoli", status: "selected" })]));

    await turn("I booked Via Napoli for 6:10.");
    expect(state.planningWorkspace.diningPlans).toHaveLength(1);
    expect(state.planningWorkspace.diningPlans[0]).toMatchObject({ restaurant: "Via Napoli", status: "confirmed", targetTime: "18:10" });

    await turn("Actually Helena is 3 now.");
    expect(state.party.travellers).toHaveLength(1);
    expect(state.party.travellers[0]?.age).toBe(3);
    expect(state.planningWorkspace.diningPlans[0]?.status).toBe("confirmed");
  });

  it("Portuguese golden workspace scenario selects BLT without confirmation", async () => {
    let state = createEmptyPixieTripState("2026-08-13T12:00:00.000Z");
    const provider = successfulProvider();
    const turn = async (message: string) => {
      const result = await runPixiePlannerTurn({ state, message, provider, now: "2026-08-13T12:00:00.000Z" });
      state = result.updatedState;
    };

    await turn("Vamos ficar de 29 de agosto a 5 de setembro com nossa filha de 2 anos.");
    expect(state.party.adults).toBe(2);
    expect(state.party.children).toBe(1);
    expect(state.dates.arrivalDate).toBe("2026-08-29");

    await turn("Quero ficar perto do Magic Kingdom porque vamos sair tarde da festa.");
    expect(state.preferences.resortPriorities).toEqual(expect.arrayContaining(["stay near Magic Kingdom"]));
    expect(state.planningWorkspace.attentionItems).toEqual(expect.arrayContaining([expect.objectContaining({ category: "logistics" })]));

    await turn("Bay Lake Tower parece perfeito. Vamos ficar lá.");
    expect(state.planningWorkspace.lodgingPlans).toEqual(expect.arrayContaining([expect.objectContaining({ resort: "Bay Lake Tower", status: "selected" })]));
    expect(state.planningWorkspace.lodgingPlans.find((plan) => plan.resort === "Bay Lake Tower")?.status).not.toBe("confirmed");
    expect(state.planningWorkspace.lodgingPlans.some((plan) => plan.resort === "Animal Kingdom Villas")).toBe(false);
  });

  it("keeps current trip memory consistent across a long multi-turn conversation", async () => {
    let state = createEmptyPixieTripState("2026-08-13T12:00:00.000Z");
    let providerInput: PixiePlannerTurnInput | undefined;
    const provider = successfulProvider((input) => {
      providerInput = input;
    });
    const turn = async (message: string) => {
      const result = await runPixiePlannerTurn({ state, message, provider, now: "2026-08-13T12:00:00.000Z" });
      state = result.updatedState;
      return result;
    };

    await turn("We're going September 1 to 6, two adults and our 2-year-old.");
    await turn("We'll pay more for convenience.");
    await turn("We're doing the Magic Kingdom Halloween party September 1.");
    await turn("Where should we stay?");
    await turn("Bay Lake sounds perfect. Let's do that.");
    await turn("We're doing EPCOT September 3.");
    await turn("Give me dinner choices.");
    await turn("No Polynesian.");
    await turn("Via Napoli sounds good.");
    await turn("Actually let's do Biergarten instead.");
    await turn("Booked Biergarten at 6:15.");
    await turn("What should we do at Magic Kingdom with our daughter?");
    await turn("She's actually 3 now.");
    await turn("What restaurant did we book?");
    await turn("We changed EPCOT to September 4.");
    await turn("What needs fixing?");
    await turn("I own at BoardWalk.");
    await turn("What's my Use Year?");
    await turn("We still need to pick one character breakfast.");
    await turn("Remind me what we already chose.");

    expect(state.party.adults).toBe(2);
    expect(state.party.children).toBe(1);
    expect(state.party.travellers[0]?.age).toBe(3);
    expect(state.dates.arrivalDate).toBe("2026-09-01");
    expect(state.dates.departureDate).toBe("2026-09-06");
    expect(state.preferences.resortPriorities).toEqual(expect.arrayContaining(["price sensitivity low"]));
    expect(state.preferences.excludedResorts).toContain("Polynesian Villas");
    expect(state.planningWorkspace.lodgingPlans).toEqual(expect.arrayContaining([expect.objectContaining({ resort: "Bay Lake Tower", status: "selected" })]));
    expect(state.planningWorkspace.parkPlans).toEqual(expect.arrayContaining([expect.objectContaining({ park: "EPCOT", date: "2026-09-04", status: "planned" })]));
    expect(state.planningWorkspace.parkPlans.some((plan) => plan.park === "EPCOT" && plan.date === "2026-09-03")).toBe(false);
    expect(state.planningWorkspace.diningPlans).toHaveLength(1);
    expect(state.planningWorkspace.diningPlans[0]).toMatchObject({ restaurant: "Biergarten", date: "2026-09-03", status: "confirmed", targetTime: "18:15" });
    expect(state.planningWorkspace.attentionItems).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Biergarten date conflict" })]));
    expect(providerInput?.currentPlanSummary?.travelers).toEqual(expect.arrayContaining([expect.stringMatching(/2 adults/i), expect.stringMatching(/age 3/i)]));
    expect(providerInput?.currentPlanSummary?.lodging).toEqual(expect.arrayContaining([expect.stringMatching(/Bay Lake Tower - selected/i)]));
    expect(providerInput?.currentPlanSummary?.dining).toEqual(expect.arrayContaining([expect.stringMatching(/Biergarten - confirmed at 18:15/i)]));
    expect(providerInput?.currentPlanSummary?.rejectedOptions).toContain("resort: Polynesian Villas");
    expect(JSON.stringify(providerInput?.currentPlanSummary).length).toBeLessThan(3500);
    expect(providerInput?.recentMessages.length ?? 0).toBeLessThanOrEqual(8);
  });

  it("keeps Portuguese current-trip memory available after unrelated turns", async () => {
    let state = createEmptyPixieTripState("2026-08-13T12:00:00.000Z");
    let providerInput: PixiePlannerTurnInput | undefined;
    const provider = successfulProvider((input) => {
      providerInput = input;
    });
    const turn = async (message: string) => {
      const result = await runPixiePlannerTurn({ state, message, provider, now: "2026-08-13T12:00:00.000Z" });
      state = result.updatedState;
    };

    await turn("Vamos de 1 a 6 de setembro, eu, meu marido e nossa filha de 2 anos.");
    await turn("Vamos pagar mais pela conveniência.");
    await turn("Vamos à festa do Magic Kingdom dia 1.");
    await turn("Qual hotel você escolheria?");
    await turn("Bay Lake está perfeito. Vamos nele.");
    await turn("Quais atrações são boas para ela?");
    await turn("E onde podemos descansar?");
    await turn("Qual hotel nós escolhemos mesmo?");

    expect(state.planningWorkspace.lodgingPlans).toEqual(expect.arrayContaining([expect.objectContaining({ resort: "Bay Lake Tower", status: "selected" })]));
    expect(providerInput?.currentPlanSummary?.lodging).toEqual(expect.arrayContaining([expect.stringMatching(/Bay Lake Tower - selected/i)]));
    expect(providerInput?.currentPlanSummary?.travelers).toEqual(expect.arrayContaining([expect.stringMatching(/2 adults/i), expect.stringMatching(/age 2/i)]));
  });

  it("golden Portuguese decisiveness scenario names obvious concrete recommendations and completes itinerary", async () => {
    let state = createEmptyPixieTripState("2026-08-13T12:00:00.000Z");
    const responses: string[] = [];
    const provider = {
      async createPlannerTurn(input: PixiePlannerTurnInput) {
        let assistantResponse = "Com esses detalhes, eu recomendaria seguir com a opção mais conveniente.";
        if (/onde eu deveria ficar/i.test(input.latestUserMessage)) assistantResponse = "Eu escolheria Bay Lake Tower para a primeira noite.";
        if (/segundo ao quarto|disney springs?/i.test(input.latestUserMessage)) assistantResponse = "Essa parte pede proximidade com Disney Springs.";
        if (/perto do epcot/i.test(input.latestUserMessage)) assistantResponse = "Para EPCOT, a região do International Gateway faz mais sentido.";
        if (/personagens|princesas/i.test(input.latestUserMessage)) assistantResponse = "Um almoço com personagens dentro do EPCOT faz sentido.";
        if (/qual seria nosso itinerario/i.test(input.latestUserMessage)) assistantResponse = "Posso montar o roteiro.";
        if (/por favor/i.test(input.latestUserMessage)) assistantResponse = "Claro — vou montar um roteiro simples.";
        return {
          result: {
            assistantResponse,
            tripPatch: {},
            requestedTools: [],
            planningIntent: "update_trip" as const,
            conversationMode: "decision_support" as const,
            activeDecisionKey: "resort_choice" as const,
            confidence: 0.8,
            warnings: [],
          },
          metadata: { provider: "fixture", model: "fixture-model", promptVersion: "fixture-prompt", sourceVersion: "fixture" },
          usage: { provider: "fixture", model: "fixture-model", promptVersion: "fixture-prompt", inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        };
      },
    };
    const history: Array<{ role: "user" | "assistant"; content: string }> = [];
    const turn = async (message: string) => {
      const recentMessages = [...history.slice(-8), { role: "user" as const, content: message }];
      const result = await runPixiePlannerTurn({ state, message, recentMessages, provider, now: "2026-08-13T12:00:00.000Z" });
      state = result.updatedState;
      responses.push(result.assistantResponse);
      history.push({ role: "user", content: message }, { role: "assistant", content: result.assistantResponse });
      return result;
    };

    await turn("ola eu tenho uma viagem pro dia 1 de setembro e vamos participar de uma festa de halloween. onde eu deveria ficar");
    await turn("vamos de 1 a 6 de setembro, eu, meu marido e nossa filha de 2 anos. conveniencia vale mais que preco.");
    const bayLake = await turn("Bay Lake Tower parece perfeito. eu ficaria no bay lake somente no primeiro dia.");
    expect(bayLake.updatedState.planningWorkspace.lodgingPlans).toEqual(expect.arrayContaining([expect.objectContaining({ resort: "Bay Lake Tower", status: "selected" })]));

    const saratoga = await turn("no segundo ao quarto dia eu gostaria de algo perto da disney springs e almocar num restaurante naquela area");
    expect(saratoga.assistantResponse).toContain("Disney's Saratoga Springs Resort & Spa");
    expect(saratoga.assistantResponse).not.toMatch(/voc[eê]s preferem/i);
    expect(saratoga.updatedState.planningWorkspace.lodgingPlans).toEqual(expect.arrayContaining([expect.objectContaining({ resort: "Disney's Saratoga Springs Resort & Spa", status: "recommended" })]));

    const boardwalk = await turn("ate o dia 4, depois queremos ficar perto do epcot tambem com um almoco");
    expect(boardwalk.assistantResponse).toMatch(/BoardWalk Villas|Beach Club Villas/);
    expect(boardwalk.updatedState.planningWorkspace.lodgingPlans).toEqual(expect.arrayContaining([expect.objectContaining({ resort: "BoardWalk Villas", status: "recommended" })]));

    await turn("dentro da epcot");
    await turn("um almoco com personagens seria legal");
    const akershus = await turn("que tal princesas desde que temos uma tambem!");
    expect(akershus.assistantResponse).toContain("Akershus Royal Banquet Hall");
    expect(akershus.updatedState.planningWorkspace.diningPlans).toEqual(expect.arrayContaining([expect.objectContaining({ restaurant: "Akershus Royal Banquet Hall", status: "planned" })]));

    await turn("perfeito qual seria o nosso itinerario entao");
    const itinerary = await turn("por favor");
    expect(itinerary.assistantResponse).toMatch(/Bay Lake Tower|Saratoga Springs|BoardWalk Villas|Akershus Royal Banquet Hall/);
    expect(itinerary.assistantResponse).not.toMatch(/vou montar|vou organizar|I have 3 resort|strongest fit|room fit/i);
    expect(responses.join("\n")).not.toMatch(/I have 3 resort|strongest fit|room fit|Budget fit will improve/);
    expect(state.planningWorkspace.lodgingPlans.some((plan) => plan.status === "confirmed")).toBe(false);
    expect(state.planningWorkspace.diningPlans.some((plan) => plan.status === "confirmed")).toBe(false);
  });

  it("passes compact DVC rule context to the provider for narrow DVC turns", async () => {
    let providerInput: PixiePlannerTurnInput | undefined;
    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      message: "I own at BoardWalk. Can I book BoardWalk for December 15 2028?",
      provider: successfulProvider((input) => {
        providerInput = input;
      }),
      now: "2026-08-13T12:01:00.000Z",
    });

    expect(providerInput?.dvcContext?.source).toBe("pixie_dvc_rules_v1");
    expect(providerInput?.dvcContext?.results.length).toBeLessThanOrEqual(4);
    expect(providerInput?.dvcContext?.results[0]).toMatchObject({
      reasonCodes: expect.arrayContaining(["HOME_RESORT", "BOOKING_WINDOW_NOT_OPEN"]),
    });
    expect(providerInput?.dvcContext?.results[0]?.factsUsed).toEqual(expect.arrayContaining([expect.objectContaining({ label: "homeOpenDate" })]));
  });

  it("provider failure emits a typed stream failure instead of a completed fallback turn", async () => {
    const state = createEmptyPixieTripState("2026-07-11T12:00:00.000Z");
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state,
      message: "Help",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(["turn_started", "turn_failed"]);
    const failed = events.at(-1);
    expect(failed?.type).toBe("turn_failed");
    if (failed?.type === "turn_failed") {
      expect(failed.error.code).toBe("provider_timeout");
      expect(failed.error.message).toBe("OpenAI provider request timed out.");
    }
  });

  it("streams lightweight trip extraction before a later provider failure", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "We are planning October 28 through November 4, 2026. Bay Lake Tower is 18 points, Polynesian is 22 points, and Bay Lake has a waitlist. We have a Magic Kingdom Halloween party and want to minimize resort changes, save points, and stay near Magic Kingdom.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual(["turn_started", "trip_patch_applied", "turn_failed"]);
    const patchEvent = events[1];
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBe("2026-10-28");
      expect(patchEvent.updatedState.dates.departureDate).toBe("2026-11-04");
      expect(patchEvent.updatedState.preferences.preferredResorts).toEqual(expect.arrayContaining(["Bay Lake Tower", "Polynesian Villas"]));
      expect(patchEvent.updatedState.preferences.parkPriorities).toContain("Magic Kingdom");
      expect(patchEvent.updatedState.preferences.resortPriorities).toEqual(
        expect.arrayContaining(["minimize resort changes", "save points where reasonable", "stay near Magic Kingdom"]),
      );
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("Point values mentioned");
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("Waitlist alternatives mentioned");
      expect(patchEvent.updatedState.party.totalPartySize).toBeUndefined();
      expect(patchEvent.updatedState.budget.budgetType).toBe("unknown");
    }
  });

  it("extracts DVC planning workspace facts before a later provider failure", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "September Use Year. Current-year 9 points remaining, next-year 220 points, borrowing contemplated. Saratoga Studio Sept 1-2 is 9 points and traveler availability says BoardWalk Studio Sept 3 is available for 10 points. Sept 5 unresolved. BLT waitlist Sept 1. Worried about Holding if we cancel Saratoga inside 30 days.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dvcContext.useYear).toBe("September");
      expect(patchEvent.updatedState.dvcContext.currentUseYearPoints?.points).toBe(9);
      expect(patchEvent.updatedState.dvcContext.nextUseYearPoints?.points).toBe(220);
      expect(patchEvent.updatedState.dvcContext.borrowingContemplated).toBe(true);
      expect(patchEvent.updatedState.dvcContext.borrowedPoints).toBeUndefined();
      expect(patchEvent.updatedState.planningWorkspace.workingItinerary.some((night) => night.date === "2026-09-05" && night.status === "unresolved")).toBe(true);
      expect(patchEvent.updatedState.planningWorkspace.availabilityObservations[0]?.source).toBe("traveler_reported");
      expect(patchEvent.updatedState.planningWorkspace.availabilityObservations[0]?.source).not.toBe("HannaDVC_verified");
      expect(patchEvent.updatedState.planningWorkspace.activeDecisions.some((decision) => decision.id === "dvc_cancellation_modification_risk")).toBe(true);
    }
  });

  it("does not retain stale complete dates when a new message contains unparsed September availability dates", async () => {
    const previousState = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      dates: { arrivalDate: "2026-10-28", departureDate: "2026-11-04" },
    });
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: previousState,
      message:
        "Sept 1 has Bay Lake Tower for 18 points. Sept 2 has Polynesian for 22 points. Sept 3 has Copper Creek. Sept 4 has BoardWalk. Sept 5 only waitlists. We want to save points.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBeUndefined();
      expect(patchEvent.updatedState.dates.departureDate).toBeUndefined();
      expect(patchEvent.updatedState.dates.numberOfNights).toBeUndefined();
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("Sept 1");
      expect(patchEvent.updatedState.preferences.generalNotes).not.toContain("Oct 28");
    }
  });

  it("extracts explicit arrival without fabricating checkout from availability dates", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "Arriving Sept 1, 2026. Sept 2 has Bay Lake Tower. Sept 3 has Polynesian. Sept 4 has Copper Creek. Sept 5 only waitlists.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBe("2026-09-01");
      expect(patchEvent.updatedState.dates.departureDate).toBeUndefined();
      expect(patchEvent.updatedState.dates.numberOfNights).toBeUndefined();
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("Sept 5");
    }
  });

  it("extracts explicit checkout when supplied without keeping stale arrival", async () => {
    const previousState = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      dates: { arrivalDate: "2026-10-28", departureDate: "2026-11-04" },
    });
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: previousState,
      message: "Checking out Sept 5, 2026. Bay Lake Tower has waitlists and we want to save points.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBeUndefined();
      expect(patchEvent.updatedState.dates.departureDate).toBe("2026-09-05");
      expect(patchEvent.updatedState.dates.numberOfNights).toBeUndefined();
    }
  });

  it("extracts clear me-wife-and-two-year-old party details", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "It is for me, my wife and my 2 year old.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adults).toBe(2);
    expect(result.updatedState.party.children).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBe(3);
    expect(result.updatedState.party.travellers).toHaveLength(1);
    expect(result.updatedState.party.travellers[0]?.age).toBe(2);
    expect(result.updatedState.party.travellers[0]?.category).toBe("child");
  });

  it("infers two adults for plural-family phrasing with our two-year-old", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "We're at Magic Kingdom with our 2-year-old and she missed her nap.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adults).toBe(2);
    expect(result.updatedState.party.adultCount).toBe(2);
    expect(result.updatedState.party.children).toBe(1);
    expect(result.updatedState.party.childCount).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBe(3);
    expect(result.updatedState.party.travellers[0]).toMatchObject({ age: 2, category: "child", ageGroup: "preschooler" });
  });

  it("infers two adults for we-are phrasing with our two year old", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "We are at Magic Kingdom with our 2 year old.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adultCount).toBe(2);
    expect(result.updatedState.party.childCount).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBe(3);
    expect(result.updatedState.party.travellers[0]?.ageGroup).toBe("preschooler");
  });

  it("infers one adult for singular phrasing with my two-year-old", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "I'm with my 2-year-old.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adultCount).toBe(1);
    expect(result.updatedState.party.childCount).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBe(2);
    expect(result.updatedState.party.travellers[0]?.ageGroup).toBe("preschooler");
  });

  it("infers one adult for I-am phrasing with my two-year-old", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "I am with my 2-year-old.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adultCount).toBe(1);
    expect(result.updatedState.party.childCount).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBe(2);
  });

  it("leaves adults unknown for standalone possessive two-year-old phrasing", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "My 2-year-old missed her nap.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adultCount).toBeUndefined();
    expect(result.updatedState.party.childCount).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBeUndefined();
    expect(result.updatedState.party.travellers[0]?.ageGroup).toBe("preschooler");
  });

  it("leaves adults unknown for our two-year-old without a clear plural subject", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "Our 2-year-old missed her nap.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adultCount).toBeUndefined();
    expect(result.updatedState.party.childCount).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBeUndefined();
  });

  it("lets explicit adult counts override plural-family inference", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "We're 3 adults with our 2-year-old.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.adultCount).toBe(3);
    expect(result.updatedState.party.childCount).toBe(1);
    expect(result.updatedState.party.totalPartySize).toBe(4);
  });

  it("streams inferred plural-family two-year-old traveler state", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "We're at Magic Kingdom with our 2-year-old and she missed her nap.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.party.adultCount).toBe(2);
      expect(patchEvent.updatedState.party.childCount).toBe(1);
      expect(patchEvent.updatedState.party.totalPartySize).toBe(3);
      expect(patchEvent.updatedState.party.travellers[0]?.ageGroup).toBe("preschooler");
      expect(patchEvent.updatedState.party.ageGroupSummary?.infant).toBe(0);
    }
  });

  it("does not guess ambiguous traveler wording", async () => {
    const result = await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "It is for my family.",
      provider: successfulProvider(),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(result.updatedState.party.totalPartySize).toBeUndefined();
    expect(result.updatedState.party.travellers).toHaveLength(0);
  });

  it("keeps the normal provider timeout for simple planning turns", async () => {
    let timeoutMs: number | undefined;
    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message: "We are two adults.",
      provider: successfulProvider((_, options) => {
        timeoutMs = options?.timeoutMs;
      }),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(timeoutMs).toBe(30_000);
  });

  it("uses a bounded extended provider timeout for complex multi-resort planning turns", async () => {
    let timeoutMs: number | undefined;
    await runPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "Sept 1 Bay Lake Tower 18 points, Sept 2 Polynesian 22 points, Sept 3 Copper Creek 17 points, Sept 4 BoardWalk 20 points, Sept 5 Riviera 23 points. There are waitlists, save points, and stay near Magic Kingdom.",
      provider: successfulProvider((_, options) => {
        timeoutMs = options?.timeoutMs;
      }),
      now: "2026-08-09T12:01:00.000Z",
    });

    expect(timeoutMs).toBe(45_000);
  });

  it("keeps valid lightweight facts when an extracted date range is invalid", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-08-09T12:00:00.000Z"),
      message:
        "We are planning November 4 through October 28, 2026. Bay Lake Tower has a waitlist, costs 18 points, and we want to stay near Magic Kingdom.",
      provider: {
        async createPlannerTurn() {
          throw new PixieAiException("provider_timeout", "OpenAI provider request timed out.");
        },
      },
      now: "2026-08-09T12:01:00.000Z",
    })) {
      events.push(event);
    }

    const patchEvent = events.find((event) => event.type === "trip_patch_applied");
    expect(patchEvent?.type).toBe("trip_patch_applied");
    if (patchEvent?.type === "trip_patch_applied") {
      expect(patchEvent.updatedState.dates.arrivalDate).toBeUndefined();
      expect(patchEvent.updatedState.preferences.preferredResorts).toContain("Bay Lake Tower");
      expect(patchEvent.updatedState.preferences.resortPriorities).toContain("stay near Magic Kingdom");
      expect(patchEvent.updatedState.preferences.generalNotes).toContain("18 points");
    }
  });

  it("streaming contract emits final authoritative result", async () => {
    const events = [];
    for await (const event of streamPixiePlannerTurn({
      state: createEmptyPixieTripState("2026-07-11T12:00:00.000Z"),
      message: "Hi",
      provider: createFixturePixieProvider({
        result: {
          assistantResponse: "When would you like to travel?",
          tripPatch: {},
          requestedTools: [],
          nextQuestionKey: "ask_dates",
          planningIntent: "collect_information",
          confidence: 0.8,
          warnings: [],
        },
      }),
    })) {
      events.push(event);
    }
    expect(events[0]?.type).toBe("turn_started");
    expect(events.at(-1)?.type).toBe("turn_completed");
    const started = events[0];
    const completed = events.at(-1);
    expect(started?.turnId).toMatch(/^pixie_turn_/);
    expect(completed?.turnId).toBe(started?.turnId);
    if (completed?.type === "turn_completed") {
      expect(completed.result.turnId).toBe(started?.turnId);
    }
    expect(events.every((event) => event.turnId === started?.turnId)).toBe(true);
  });
});
