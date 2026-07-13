"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import PixieShell from "@/components/pixie/PixieShell";
import {
  applyPixieStreamEvent,
  beginPixieTurn,
  createClientMessage,
  createInitialPixieChatState,
  failPixieTurn,
  recentMessagesFromClient,
  resetPixieChatState,
} from "@/lib/pixie/client/chat-state";
import { clearPixieDraftFromBrowser, readPixieDraftFromBrowser, writePixieDraftToBrowser } from "@/lib/pixie/client/draft-storage";
import { PixieChatApiError, sendPixieMessage } from "@/lib/pixie/client/api";
import { trackPixieEvent } from "@/lib/pixie/client/analytics";
import type { PixieChatState } from "@/lib/pixie/client/types";
import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";

export default function PixieClient({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<PixieChatState>(() => createInitialPixieChatState());
  const [hydrated, setHydrated] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const restoredRef = useRef(false);
  const firstMessageTrackedRef = useRef(false);

  useEffect(() => {
    trackPixieEvent("pixie_page_viewed", { enabled });
  }, [enabled]);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const draft = readPixieDraftFromBrowser();
    if (draft) {
      const restoredMessages = draft.recentMessages.length
        ? [
            createClientMessage(
              "assistant",
              "Welcome back. I restored the trip details saved in this browser.",
              "pixie_restored",
            ),
            ...draft.recentMessages.map((message) =>
              createClientMessage(message.role, message.content, `pixie_restored_${message.role}`),
            ),
          ]
        : undefined;
      setState((prev) => ({
        ...prev,
        tripState: draft.state,
        completeness: evaluatePixieCompleteness(draft.state),
        recentMessages: draft.recentMessages,
        messages: restoredMessages ?? prev.messages,
        recoveryNotice: draft.notice,
      }));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      writePixieDraftToBrowser(state.tripState, state.recentMessages);
    }, 400);
    return () => clearTimeout(timeout);
  }, [hydrated, state.tripState, state.recentMessages]);

  const canSend = enabled && state.status !== "sending" && state.status !== "thinking" && state.pendingInput.trim().length > 0;

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || !enabled) return;

    if (!firstMessageTrackedRef.current) {
      firstMessageTrackedRef.current = true;
      trackPixieEvent("pixie_first_message_sent", { stage: state.tripState.planningStage });
    }
    trackPixieEvent("pixie_planning_started", { stage: state.tripState.planningStage });

    const nextState = beginPixieTurn(state, trimmed);
    setState(nextState);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await sendPixieMessage({
        state: state.tripState,
        message: trimmed,
        recentMessages: recentMessagesFromClient(nextState.messages),
        draftId: state.draftId,
        signal: controller.signal,
        onEvent(event) {
          setState((current) => {
            const updated = applyPixieStreamEvent(current, event);
            if (event.type === "turn_completed") {
              trackPixieEvent("pixie_turn_completed", {
                stage: event.result.planningStage,
                resortCount: event.result.recommendations?.recommendations.length ?? 0,
                readyStayCount: event.result.readyStayMatches?.matches.length ?? 0,
              });
              if ((event.result.recommendations?.recommendations.length ?? 0) > 0) {
                trackPixieEvent("pixie_resort_recommendations_shown", {
                  count: event.result.recommendations?.recommendations.length ?? 0,
                });
              }
              if ((event.result.readyStayMatches?.matches.length ?? 0) > 0) {
                trackPixieEvent("pixie_ready_stay_matches_shown", {
                  count: event.result.readyStayMatches?.matches.length ?? 0,
                });
              }
              if (event.result.completeness.score > current.completeness.score) {
                trackPixieEvent("pixie_profile_progressed", {
                  from: current.completeness.score,
                  to: event.result.completeness.score,
                  stage: event.result.planningStage,
                });
              }
            }
            if (event.type === "turn_failed") {
              trackPixieEvent("pixie_turn_failed", { code: event.error.code });
            }
            return updated;
          });
        },
      });
    } catch (error) {
      if (controller.signal.aborted) {
        setState((current) => ({ ...current, status: "cancelled", pendingInput: trimmed }));
        return;
      }
      const clientError =
        error instanceof PixieChatApiError
          ? error.error
          : { code: "network_error", message: "Pixie is having trouble responding right now. Your trip draft is still safe." };
      trackPixieEvent("pixie_turn_failed", { code: clientError.code });
      setState((current) => failPixieTurn(current, clientError, trimmed));
    } finally {
      abortRef.current = null;
    }
  }

  function cancelTurn() {
    abortRef.current?.abort();
    setState((current) => ({ ...current, status: "cancelled", currentAssistantText: "" }));
  }

  function resetTrip() {
    abortRef.current?.abort();
    clearPixieDraftFromBrowser();
    setState(resetPixieChatState());
    setResetOpen(false);
    trackPixieEvent("pixie_trip_reset");
  }

  const disabledReason = useMemo(() => {
    if (enabled) return undefined;
    return "Pixie is not publicly enabled in this environment yet.";
  }, [enabled]);

  return (
    <PixieShell
      state={state}
      enabled={enabled}
      disabledReason={disabledReason}
      canSend={canSend}
      planOpen={planOpen}
      resetOpen={resetOpen}
      onPlanOpenChange={setPlanOpen}
      onResetOpenChange={setResetOpen}
      onInputChange={(value) => setState((current) => ({ ...current, pendingInput: value }))}
      onSend={sendMessage}
      onCancel={cancelTurn}
      onReset={resetTrip}
      onSavePromptShown={() => {
        if (!state.savePromptShown) {
          setState((current) => ({ ...current, savePromptShown: true }));
          trackPixieEvent("pixie_save_prompt_shown", { stage: state.tripState.planningStage });
        }
      }}
    />
  );
}

