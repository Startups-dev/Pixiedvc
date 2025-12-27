import type { LucideIcon } from "lucide-react";
import {
  Anchor,
  CableCar,
  Castle,
  Coffee,
  Flame,
  Gem,
  Music,
  Palette,
  Palmtree,
  Sparkles,
  Train,
  TreePine,
  Waves,
} from "lucide-react";

type Props = {
  label: string;
  variant?: "light" | "dark";
};

type IconRule = {
  test: RegExp;
  icon: LucideIcon;
};

const ICON_RULES: IconRule[] = [
  { test: /magic kingdom|castle/i, icon: Castle },
  { test: /monorail|train/i, icon: Train },
  { test: /skyliner|cable/i, icon: CableCar },
  { test: /pool|lakeside|water|lagoon|geyser/i, icon: Waves },
  { test: /pianist|music|live/i, icon: Music },
  { test: /victoria|albert|spa/i, icon: Gem },
  { test: /island|tropical|bungalow|overwater/i, icon: Palmtree },
  { test: /european|art/i, icon: Palette },
  { test: /terrace|coffee|cafe/i, icon: Coffee },
  { test: /rustic|cabins|wilderness|forest/i, icon: TreePine },
  { test: /launch|marina|boat|waterfront/i, icon: Anchor },
  { test: /campfire|hearth|fire/i, icon: Flame },
];

function normalizeLabel(label: string) {
  return label.replace(/^[^a-z0-9]+/i, "").trim();
}

function resolveIcon(label: string) {
  for (const rule of ICON_RULES) {
    if (rule.test.test(label)) {
      return rule.icon;
    }
  }
  return Sparkles;
}

export default function ResortChip({ label, variant = "light" }: Props) {
  const normalized = normalizeLabel(label);
  const Icon = resolveIcon(normalized);
  const base = "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold";
  const styles =
    variant === "dark"
      ? "bg-[#0F2148]/10 text-[#0F2148]/70"
      : "bg-white/15 text-white/90";

  return (
    <span className={`${base} ${styles}`}>
      <Icon className="h-3.5 w-3.5" />
      {normalized}
    </span>
  );
}
