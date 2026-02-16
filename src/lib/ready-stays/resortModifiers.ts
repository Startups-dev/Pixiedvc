export type ResortModifierKey =
  | "VGF"
  | "POL"
  | "BCV"
  | "BWV"
  | "RIV"
  | "BLT"
  | "CCV"
  | "BRV"
  | "AKV"
  | "SSR"
  | "OKW"
  | "AUL"
  | "VGC"
  | "HH"
  | "VB"
  | "DEFAULT";

const MODIFIERS_DOLLARS: Record<ResortModifierKey, number> = {
  VGF: 4,
  POL: 3,
  BCV: 3,
  BWV: 2,
  RIV: 2,
  BLT: 2,
  CCV: 2,
  BRV: 1,
  AKV: 1,
  SSR: 0,
  OKW: 0,
  AUL: 1,
  VGC: 4,
  HH: 0,
  VB: 0,
  DEFAULT: 0,
};

export function getResortModifierDollars(calculatorCode: string | null | undefined) {
  if (!calculatorCode) return MODIFIERS_DOLLARS.DEFAULT;
  const key = calculatorCode.toUpperCase() as ResortModifierKey;
  return MODIFIERS_DOLLARS[key] ?? MODIFIERS_DOLLARS.DEFAULT;
}
