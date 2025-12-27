export const FALLBACK_CALC_CODE_BY_SLUG: Record<string, string> = {
  'animal-kingdom-villas': 'AKV',
  aulani: 'AUL',
  'bay-lake-tower': 'BLT',
  'beach-club-villas': 'BCV',
  'boardwalk-villas': 'BWV',
  'boulder-ridge-villas': 'BRV',
  'hilton-head-island': 'HHI',
  'old-key-west': 'OKW',
  'polynesian-villas': 'PVB',
  'riviera-resort': 'RVA',
  'saratoga-springs': 'SSR',
  'copper-creek-villas': 'CCV',
  'disneyland-hotel-villas': 'VDH',
  'grand-californian-villas': 'VGC',
  'grand-floridian-villas': 'VGF',
  'vero-beach': 'VB',
};

export type ResortCalculatorMeta = {
  slug?: string | null;
  calculator_code?: string | null;
};

export function resolveCalculatorCode(meta?: ResortCalculatorMeta | null) {
  if (!meta) return null;
  if (meta.calculator_code) return meta.calculator_code;
  if (meta.slug) {
    return FALLBACK_CALC_CODE_BY_SLUG[meta.slug] ?? null;
  }
  return null;
}
