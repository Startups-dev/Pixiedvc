import { MATCHING_PRESETS, type MatchingPresetKey } from './presets';

export default function PresetBar({
  selectedKey,
  onSelectPreset,
  onClearPreset,
  hint,
}: {
  selectedKey: MatchingPresetKey | null;
  onSelectPreset: (presetKey: MatchingPresetKey) => void;
  onClearPreset: () => void;
  hint: string | null;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quick views</p>
          {hint ? <p className="mt-1 text-sm text-slate-600">{hint}</p> : null}
        </div>
        {selectedKey ? (
          <button
            type="button"
            onClick={onClearPreset}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            Clear preset
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {MATCHING_PRESETS.map((preset) => {
          const isSelected = selectedKey === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => onSelectPreset(preset.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                isSelected
                  ? 'border-indigo-200 bg-indigo-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
