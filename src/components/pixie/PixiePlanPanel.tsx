import PixiePlanOutline from "@/components/pixie/PixiePlanOutline";
import PixiePlanningWorkspace from "@/components/pixie/PixiePlanningWorkspace";
import PixieProgress from "@/components/pixie/PixieProgress";
import PixieReadyStayMatches from "@/components/pixie/PixieReadyStayMatches";
import PixieResortRecommendations from "@/components/pixie/PixieResortRecommendations";
import PixieSavePrompt from "@/components/pixie/PixieSavePrompt";
import PixieTripSummary from "@/components/pixie/PixieTripSummary";
import PixieWarnings from "@/components/pixie/PixieWarnings";
import type { PixieChatState } from "@/lib/pixie/client/types";

export default function PixiePlanPanel({ state, onSavePromptShown }: { state: PixieChatState; onSavePromptShown: () => void }) {
  const hasActiveWorkspace =
    state.tripState.planningWorkspace.workingItinerary.length > 0 ||
    state.tripState.planningWorkspace.activeDecisions.some((decision) => decision.status !== "resolved") ||
    state.tripState.planningWorkspace.availabilityObservations.length > 0;

  return (
    <div className="space-y-4">
      <PixieProgress completeness={state.completeness} />
      <PixieTripSummary state={state.tripState} />
      <PixiePlanningWorkspace state={state.tripState} />
      {!hasActiveWorkspace ? <PixieResortRecommendations recommendations={state.recommendations} /> : null}
      <PixieReadyStayMatches matches={state.readyStayMatches} />
      <PixiePlanOutline outline={state.planOutline} />
      <PixieWarnings warnings={state.warnings} />
      <PixieSavePrompt state={state} onShown={onSavePromptShown} />
    </div>
  );
}
