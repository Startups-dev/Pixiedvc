"use client";

import PixieChat from "@/components/pixie/PixieChat";
import PixieDesktopPlanPanel from "@/components/pixie/PixieDesktopPlanPanel";
import PixieHeader from "@/components/pixie/PixieHeader";
import PixieMobilePlanDrawer from "@/components/pixie/PixieMobilePlanDrawer";
import PixieResetDialog from "@/components/pixie/PixieResetDialog";
import type { PixieChatState } from "@/lib/pixie/client/types";

type PixieShellProps = {
  state: PixieChatState;
  enabled: boolean;
  disabledReason?: string;
  canSend: boolean;
  planOpen: boolean;
  resetOpen: boolean;
  onPlanOpenChange: (open: boolean) => void;
  onResetOpenChange: (open: boolean) => void;
  onInputChange: (value: string) => void;
  onSend: (message: string) => void;
  onCancel: () => void;
  onReset: () => void;
  onSavePromptShown: () => void;
};

export default function PixieShell(props: PixieShellProps) {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f5f7fb]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <PixieHeader state={props.state} enabled={props.enabled} onResetClick={() => props.onResetOpenChange(true)} />
        {props.disabledReason ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {props.disabledReason}
          </div>
        ) : null}
        {props.state.recoveryNotice ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            {props.state.recoveryNotice}
          </div>
        ) : null}

        <div className="grid min-h-[calc(100vh-190px)] gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <PixieChat
            state={props.state}
            enabled={props.enabled}
            canSend={props.canSend}
            onInputChange={props.onInputChange}
            onSend={props.onSend}
            onCancel={props.onCancel}
            onPlanOpen={() => props.onPlanOpenChange(true)}
          />
          <PixieDesktopPlanPanel state={props.state} onSavePromptShown={props.onSavePromptShown} />
        </div>
      </div>

      <PixieMobilePlanDrawer
        open={props.planOpen}
        state={props.state}
        onClose={() => props.onPlanOpenChange(false)}
        onSavePromptShown={props.onSavePromptShown}
      />
      <PixieResetDialog open={props.resetOpen} onClose={() => props.onResetOpenChange(false)} onConfirm={props.onReset} />
    </div>
  );
}

