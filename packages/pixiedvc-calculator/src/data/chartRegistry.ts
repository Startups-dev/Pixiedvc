// src/data/chartRegistry.ts
import type { ResortYearChart } from "../engine/types.js";

// Import all 2025 charts
import AKV_2025 from "./2025/AKV.json";
import AUL_2025 from "./2025/AUL.json";
import BCV_2025 from "./2025/BCV.json";
import BLT_2025 from "./2025/BLT.json";
import BRV_2025 from "./2025/BRV.json";
import BWV_2025 from "./2025/BWV.json";
import CCV_2025 from "./2025/CCV.json";
import HHI_2025 from "./2025/HHI.json";
import OKW_2025 from "./2025/OKW.json";
import PVB_2025 from "./2025/PVB.json";
import RVA_2025 from "./2025/RVA.json";
import SSR_2025 from "./2025/SSR.json";
import VB_2025 from "./2025/VB.json";
import VDH_2025 from "./2025/VDH.json";
import VGC_2025 from "./2025/VGC.json";
import VGF_2025 from "./2025/VGF.json";

// Import all 2026 charts
import AKV_2026 from "./2026/AKV.json";
import AUL_2026 from "./2026/AUL.json";
import BCV_2026 from "./2026/BCV.json";
import BLT_2026 from "./2026/BLT.json";
import BRV_2026 from "./2026/BRV.json";
import BWV_2026 from "./2026/BWV.json";
import CCV_2026 from "./2026/CCV.json";
import HHI_2026 from "./2026/HHI.json";
import OKW_2026 from "./2026/OKW.json";
import PVB_2026 from "./2026/PVB.json";
import RVA_2026 from "./2026/RVA.json";
import SSR_2026 from "./2026/SSR.json";
import VB_2026 from "./2026/VB.json";
import VDH_2026 from "./2026/VDH.json";
import VGC_2026 from "./2026/VGC.json";
import VGF_2026 from "./2026/VGF.json";

// Registry mapping
const chartRegistry: Record<string, Record<string, ResortYearChart>> = {
  "2025": {
    AKV: AKV_2025 as ResortYearChart,
    AUL: AUL_2025 as ResortYearChart,
    BCV: BCV_2025 as ResortYearChart,
    BLT: BLT_2025 as ResortYearChart,
    BRV: BRV_2025 as ResortYearChart,
    BWV: BWV_2025 as ResortYearChart,
    CCV: CCV_2025 as ResortYearChart,
    HHI: HHI_2025 as ResortYearChart,
    OKW: OKW_2025 as ResortYearChart,
    PVB: PVB_2025 as ResortYearChart,
    RVA: RVA_2025 as ResortYearChart,
    SSR: SSR_2025 as ResortYearChart,
    VB: VB_2025 as ResortYearChart,
    VDH: VDH_2025 as ResortYearChart,
    VGC: VGC_2025 as ResortYearChart,
    VGF: VGF_2025 as ResortYearChart,
  },
  "2026": {
    AKV: AKV_2026 as ResortYearChart,
    AUL: AUL_2026 as ResortYearChart,
    BCV: BCV_2026 as ResortYearChart,
    BLT: BLT_2026 as ResortYearChart,
    BRV: BRV_2026 as ResortYearChart,
    BWV: BWV_2026 as ResortYearChart,
    CCV: CCV_2026 as ResortYearChart,
    HHI: HHI_2026 as ResortYearChart,
    OKW: OKW_2026 as ResortYearChart,
    PVB: PVB_2026 as ResortYearChart,
    RVA: RVA_2026 as ResortYearChart,
    SSR: SSR_2026 as ResortYearChart,
    VB: VB_2026 as ResortYearChart,
    VDH: VDH_2026 as ResortYearChart,
    VGC: VGC_2026 as ResortYearChart,
    VGF: VGF_2026 as ResortYearChart,
  }
};

export function getResortYearChart(resortCode: string, year: number): ResortYearChart | null {
  const yearData = chartRegistry[year.toString()];
  if (!yearData) return null;
  return yearData[resortCode] || null;
}
