import PixiePlanPanel from "@/components/pixie/PixiePlanPanel";
import type { PixieChatState } from "@/lib/pixie/client/types";

export default function PixieDesktopPlanPanel({ state, onSavePromptShown }: { state: PixieChatState; onSavePromptShown: () => void }) {
  return (
    <aside className="hidden max-h-[calc(100vh-190px)] overflow-y-auto pr-1 lg:block">
      <PixiePlanPanel state={state} onSavePromptShown={onSavePromptShown} />
    </aside>
  );
}

