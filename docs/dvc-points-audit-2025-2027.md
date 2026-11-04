# HannaDVC official DVC points chart audit, 2025–2027

This audit made local calculator data, metadata, quote-flow mapping, migration, documentation, and test changes only. The migration was not applied; production databases, configuration, and deployment were not touched. The official PDFs used in the initial audit and the CFW charts were downloaded on 2026-11-02. Original chart pages were rendered and visually inspected, with extracted table values aligned against visible headers and row positions. The additional standalone Vero Beach PDF supplied afterward could not be downloaded: Disney returned HTTP 403 AccessDenied, so it was not visually inspected or hashed.

## Result

- **51 resort/year charts**: all 17 Disney resorts × 2025, 2026, and 2027.
- **50 charts VERIFIED against visually inspected official PDFs; Vero Beach 2025 remains UNVERIFIED against its standalone PDF.** The local Vero chart matches the standalone chart’s date ranges supplied in the user’s transcription, but the original PDF could not be visually inspected. The standalone chart is the selected audit reference because its stated periods resolve the booklet’s Nov 26 overlap and missing Nov 29. This is a source-selection decision; no claim is made that it is a newer revision.
- **390 resort/year accommodation combinations** and **4,773 period/category nightly rate cells** compared, including weekday and weekend rates (Aulani publishes one Sun–Sat rate per cell).
- New Vero boundary tests verify calculator behavior against the supplied dates and local rates; they do not independently establish the standalone document’s accuracy. The local chart’s six Nov 26 category rates have not been visually confirmed against that document.
- All nightly point cells in the 50 verified charts were independently compared to the official PDFs. CFW weekly totals were also checked as five Sun–Thu plus two Fri–Sat nights; weekly totals are not independently checked for the unverified Vero standalone source.
- The full list of corrected numeric cells is in [the detailed cell-by-cell CSV](dvc-points-audit-differences.csv), with existing values beside the official values.

## Inventory and category coverage

HannaDVC now supports all 17 resorts in Disney’s source set, for **51 resort/year charts**. The Cabins at Disney’s Fort Wilderness (CFW) is represented separately from Copper Creek Villas & Cabins (CCV): CFW has one official Cabin accommodation (sleeps up to 6), while CCV remains a separate resort and chart.

The repository now contains 51 annual JSON chart files, one for every supported resort/year combination. The previously present CFW 2027 JSON was checked against Disney’s original 2027 PDF: all seven period range groups and the Cabin Sun–Thu/Fri–Sat rates match. New 2025 and 2026 CFW JSON charts were transcribed and checked against their original official charts.

CFW official source records: 2025 booklet p. 10, [2026 official PDF](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/CFW-2026.pdf) (downloaded 2026-11-02, SHA-256 `d6159cbc3acf8fd4c8e0fcdef69936475e90637d5c31b243ae4857171744a281`), and [2027 official PDF](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_CFW.pdf) (downloaded 2026-11-02, SHA-256 `0e6692cf0caa6bbbd64e55cd4103835a4ce5ab404686bead34d7e05c305ea8c5`). The 2025 booklet SHA-256 is recorded in each 2025 matrix row.

AKV is one HannaDVC identifier; Disney’s directory points Jambo House and Kidani Village to the same chart. Polynesian’s published chart includes the Island Tower: main-house Deluxe Studio Resort/Preferred, bungalow, and tower Duo Studio, Deluxe Studio, One-Bedroom, Two-Bedroom, and Penthouse combinations are represented. Aulani’s official Hotel Room category is now represented. VDH Standard view is supported only for Duo Studio and Deluxe Studio; the official One-Bedroom, Two-Bedroom, and Grand Villa are Preferred-only, and unsupported Standard choices were removed.

## Fort Wilderness verification and runtime support

The original 2025 booklet p. 10 and 2026 and 2027 standalone PDFs were rendered and visually inspected. Each has a single Cabin column marked “sleeps up to 6.” Every period range and Sun–Thu/Fri–Sat value was compared with the corresponding JSON. The previously registered 2027 JSON matched all source cells; 2025 and 2026 charts were added. CFW is now included in the chart registry, shared calculator resort metadata, calculator selector, image resolution, booking quote slug mapping, and stay quote flow. A migration was prepared to ensure the existing `public.resorts` row carries CFW’s canonical slug and calculator code; it was not applied. Pixie recommendations remain excluded pending a CFW-specific room-layout model. CFW is an independent resort code and is not merged into CCV.

The calculator metadata assigns CFW to the existing Select Access pricing tier; this preserves the current tier/rate system and does not alter any tier rates. The Disney chart itself supplies points and cabin capacity only, not HannaDVC’s commercial pricing tier.

## Unresolved source issue

**Vero Beach (VB), 2025 — UNVERIFIED pending direct PDF inspection.** The complete booklet p. 22 conflicts with the standalone source URL supplied by the user: the booklet overlaps Nov 26 between periods 1 and 3 and omits Nov 29; the supplied standalone transcription sets period 1 through Nov 25, period 2 to include Nov 29, and period 3 to include Nov 26–28. I selected the standalone chart as the audit reference, explicitly on the user’s direction. Its filename includes `11.17.23`, but no revision history was found or asserted. The local Vero 2025 ranges already match the supplied standalone dates. All six point columns match the booklet’s printed values; however, the standalone file could not be downloaded from either Disney host (HTTP 403 AccessDenied), so its visual table, six rate columns, PDF page, and SHA-256 remain unverified. The boundary regression test checks the supplied reference dates, all six local accommodation columns, and weekday assignment; this does not substitute for visual verification of the inaccessible PDF.

The updated Aulani 2026 source was also checked against Disney’s current directory link. Period 4 ends Apr 11 and period 2 begins Apr 12; no overlap exists in the official PDF. (The current source is [Disney’s official chart directory](https://disneyvacationclub.disney.go.com/vacation-planning/points-charts/), which links the [2026 Aulani chart](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2026-AULV-Updated-2-11-26.pdf) and [2027 Aulani chart](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027-AULV-Updated-2-11-26.pdf).) Aulani and VDH transient accommodation tax footnotes are noted but are not point-chart values and remain outside this points-only audit.

## Confirmed corrections

- **AUL 2025:** period 1 ended Feb 25 locally, while Disney ends it Feb 22; corrected to Feb 22, before period 3 starts Feb 23. Added missing Hotel Room / Standard rates for 2025–2027: [16, 17, 18, 21] per year across four periods. AUL 2027 Deluxe Studio Standard was corrected from [16, 17, 18, 21] to [17, 19, 22, 24].
- **PVB 2025–2027:** corrected source-mismatched point values across the tables and added missing main-house Deluxe Studio Preferred. See CSV for every cell change.
- **VDH 2025–2027:** corrected dates and rates against the full official tables; removed unsupported Standard view from One-Bedroom, Two-Bedroom, and Grand Villa. See CSV for each correction/removal.
- **BWV 2026:** Deluxe Studio Resort View Sun–Thu periods 1–4 changed [9, 9, 10, 12] → [10, 10, 11, 11]; period 5 Fri–Sat changed 17 → 16. **BWV 2027:** period 5 Fri–Sat changed 17 → 16.
- **VGF 2025 and 2026:** Grand Villa Preferred period 4 Fri–Sat changed 165 → 155.
- **Calculator:** missing chart years no longer silently fall back to 2026. Missing years return unsupported (`null`) and quote calculation throws a clear “No chart” error.

## Chart-by-chart source inventory

### 2025

| Resort | Status | Official source (page) | Printed year | Download date | SHA-256 |
|---|---|---|---:|---|---|
| Animal Kingdom Villas (AKV) | VERIFIED | [PDF p. 16](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Aulani, Ko Olina, Hawai'i (AUL) | VERIFIED | [PDF p. 12](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Bay Lake Tower at Contemporary Resort (BLT) | VERIFIED | [PDF p. 13](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Beach Club Villas (BCV) | VERIFIED | [PDF p. 17](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Boardwalk Villas (BWV) | VERIFIED | [PDF p. 18](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Boulder Ridge Villas at Disney's Wilderness Lodge (BRV) | VERIFIED | [PDF p. 14](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Disney's Hilton Head Island Resort (HHI) | VERIFIED | [PDF p. 19](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Disney's Old Key West Resort (OKW) | VERIFIED | [PDF p. 20](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Disney's Polynesian Villas & Bungalows (PVB) | VERIFIED | [PDF p. 8](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Disney's Riviera Resort (RVA) | VERIFIED | [PDF p. 9](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Saratoga Springs Resort & Spa (SSR) | VERIFIED | [PDF p. 21](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Disney's Vero Beach Resort (VB) | UNVERIFIED | [standalone chart (403; page unavailable)](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/resorts/dvc-resorts/2025-VB-11.17.23.pdf); [conflicting booklet p. 22](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | Standalone unavailable; booklet downloaded 2026-11-02 | Standalone hash unavailable; booklet `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| Copper Creek Villas & Cabins at Disney's Wilderness Lodge (CCV) | VERIFIED | [PDF p. 15](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| The Cabins at Disney's Fort Wilderness Resort (CFW) | VERIFIED | [PDF p. 10](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| The Villas at Disneyland Hotel (VDH) | VERIFIED | [PDF p. 11](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| The Villas at Disney's Grand Californian Hotel & Spa (VGC) | VERIFIED | [PDF p. 23](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |
| The Villas at Disney's Grand Floridian Resort & Spa (VGF) | VERIFIED | [PDF p. 24](https://cdn1.parksmedia.wdprapps.disney.com/media/dvc/catalog/PointsCharts_FINAL.pdf) | 2025 | 2026-11-02 | `77ae4dd4a177646fa2940927112b6f60dee9a21a0db1af3893358fed1c2195af` |

### 2026

| Resort | Status | Official source (page) | Printed year | Download date | SHA-256 |
|---|---|---|---:|---|---|
| Animal Kingdom Villas (AKV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/AKV-AKV2-2026.pdf) | 2026 | 2026-11-02 | `a3ee5b8c4d1cf70e7dba189545e3c6211e24f764496722375b618c23617d2873` |
| Aulani, Ko Olina, Hawai'i (AUL) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/2026-AULV-Updated-2-11-26.pdf) | 2026 | 2026-11-02 | `ebbf606ba7ca737882101961a120119dbc21961df7d2e63663016c25543c6fd5` |
| Bay Lake Tower at Contemporary Resort (BLT) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/2026-BLT.pdf) | 2026 | 2026-11-02 | `d3573799ba716c567dd7892874aec7b56d38308822b05537e3f58b6eec5fda21` |
| Beach Club Villas (BCV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/BCV-2026.pdf) | 2026 | 2026-11-02 | `452e0617226b7a531c951f9ac37208b75933c3cfcb9db050dc494ffe4cf21ae4` |
| Boardwalk Villas (BWV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/BWALK-2026.pdf) | 2026 | 2026-11-02 | `77878c9a0a32fe01d13c24130a8ab9f156fc54d2cb50da42defb066f36acd961` |
| Boulder Ridge Villas at Disney's Wilderness Lodge (BRV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/VWL-BRV-2026.pdf) | 2026 | 2026-11-02 | `a1d3188fd078817ab901bb1ed4e0f2eb89dadfdffcc098bc84a3d4b7ee59d8fb` |
| Disney's Hilton Head Island Resort (HHI) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/HH-2026.pdf) | 2026 | 2026-11-02 | `0704decfc050b5a12104f5d438df238aa0ca233b6e48e60d8d6f553b1adbe6cc` |
| Disney's Old Key West Resort (OKW) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/CLUB-OKW-2026.pdf) | 2026 | 2026-11-02 | `b5db2998b0425b23bf229a1bdae9f15feb0db992716169db9a21ede742de45b1` |
| Disney's Polynesian Villas & Bungalows (PVB) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/POLYV-2026.pdf) | 2026 | 2026-11-02 | `6294f3daa3a903ab0a0cad7a380bb84256813b51441418ba76fd1e88667b7df4` |
| Disney's Riviera Resort (RVA) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/RIV-2026.pdf) | 2026 | 2026-11-02 | `6143342f14d3a02ba96b1e34c80307adf3278b6ad8684b9341a9966fc0c87f12` |
| Saratoga Springs Resort & Spa (SSR) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/SSR-2026.pdf) | 2026 | 2026-11-02 | `24f8ed741ce5b21432da57bdc084ba52ed28a5d30b509c59f9e340c198e627c7` |
| Disney's Vero Beach Resort (VB) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/VERO-2026.pdf) | 2026 | 2026-11-02 | `c0c44646c903b9c51464673431c1b9fb77b239f8381135c62981185399e99b89` |
| Copper Creek Villas & Cabins at Disney's Wilderness Lodge (CCV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/WCC-CCVC-2026.pdf) | 2026 | 2026-11-02 | `98606f9fe37450cf025dd84113186cb1837d123de30b2c6d9ba51aadb6cbf946` |
| The Cabins at Disney's Fort Wilderness Resort (CFW) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/CFW-2026.pdf) | 2026 | 2026-11-02 | `d6159cbc3acf8fd4c8e0fcdef69936475e90637d5c31b243ae4857171744a281` |
| The Villas at Disneyland Hotel (VDH) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/VDH-2026.pdf) | 2026 | 2026-11-02 | `c6dcfa4801326f74d86d0b7f96c214a2815c948ca560d174ad527895ce0709bc` |
| The Villas at Disney's Grand Californian Hotel & Spa (VGC) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/GCAL-2026.pdf) | 2026 | 2026-11-02 | `ba1f8e48a81876252926afde93d4f5a0e9dbdd3bfd90903fee2890586af8c3fa` |
| The Villas at Disney's Grand Floridian Resort & Spa (VGF) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/media/dvc/catalog/resorts/dvc-resorts/VGF-2026.pdf) | 2026 | 2026-11-02 | `e978c900ba8e40f087fc9f9d00f435797854949503ab2662a8ce0fad964c3f16` |

### 2027

| Resort | Status | Official source (page) | Printed year | Download date | SHA-256 |
|---|---|---|---:|---|---|
| Animal Kingdom Villas (AKV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_AKV_AKV2.pdf) | 2027 | 2026-11-02 | `e9bab323be327004f5bbfa94b89e4c4946bdae42e5255eeceb49a43a1b1786e5` |
| Aulani, Ko Olina, Hawai'i (AUL) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027-AULV-Updated-2-11-26.pdf) | 2027 | 2026-11-02 | `cfe229d3383654d208393fb9929524eb05bad5d27930eb18ffb448e7d3c8dc08` |
| Bay Lake Tower at Contemporary Resort (BLT) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_BLT.pdf) | 2027 | 2026-11-02 | `b3bd2f1d140e68f834102b3b642a7264dc9812db96317dd0aaa62786dfa3100d` |
| Beach Club Villas (BCV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_BCV.pdf) | 2027 | 2026-11-02 | `06ec6df4a1f0bfd1c784724af60014d5a408bef3837c8cd10b1b64d0c6719c04` |
| Boardwalk Villas (BWV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_BWALK.pdf) | 2027 | 2026-11-02 | `ee9f6b5f32c1368dfefa00e43528386c4e6a0c9d525cf375da95c9ce327aa1a6` |
| Boulder Ridge Villas at Disney's Wilderness Lodge (BRV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_VWL-BRV.pdf) | 2027 | 2026-11-02 | `76be7b5c8a1dabd22ed8ff17754c6bb86572702ac8e871ee03b0654493508976` |
| Disney's Hilton Head Island Resort (HHI) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_HH.pdf) | 2027 | 2026-11-02 | `5be9a94be68552e477a810823d61b72c8079bbff4ea72245f11f262ec7b7d3cf` |
| Disney's Old Key West Resort (OKW) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_CLUB-OKW.pdf) | 2027 | 2026-11-02 | `bdfe62899d6b3bf6f476c74e389f22d5d59299ddc5ffb73c7dd7fa700b811312` |
| Disney's Polynesian Villas & Bungalows (PVB) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_POLYV.pdf) | 2027 | 2026-11-02 | `d55fd425dbfb1dd407e89f1724e53644811ba14b25e5a98a74c18231cc16fadc` |
| Disney's Riviera Resort (RVA) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_RVA.pdf) | 2027 | 2026-11-02 | `61375690a99948bea5430e5bbd923def4463de67a5db5e8aa0781ec3bbdc015a` |
| Saratoga Springs Resort & Spa (SSR) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_SSR.pdf) | 2027 | 2026-11-02 | `86efe39835b642283e07a1e6265e7e36ee2460487546653ddb524a8f6a6c6de1` |
| Disney's Vero Beach Resort (VB) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_VERO.pdf) | 2027 | 2026-11-02 | `d8f34852a80765d05657a175ab3cd975ea02a8d6baa76dc53bea54096dfd90d3` |
| Copper Creek Villas & Cabins at Disney's Wilderness Lodge (CCV) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_WCC-CCVC.pdf) | 2027 | 2026-11-02 | `7b4a4a42c3c134141c1466fd69398f892d52baa4760458e6b4fa0b7d11a59c59` |
| The Cabins at Disney's Fort Wilderness Resort (CFW) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_CFW.pdf) | 2027 | 2026-11-02 | `0e6692cf0caa6bbbd64e55cd4103835a4ce5ab404686bead34d7e05c305ea8c5` |
| The Villas at Disneyland Hotel (VDH) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_VDH.pdf) | 2027 | 2026-11-02 | `d4b268b55840cae9250be437ef9eb906ae514176107e3f46d19c7e312d727de2` |
| The Villas at Disney's Grand Californian Hotel & Spa (VGC) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_GCAL-VGC.pdf) | 2027 | 2026-11-02 | `012c733c0d50fb4524e54d1f01943945e6d0f6b4fb1ecb72294cbfe3dca96ec9` |
| The Villas at Disney's Grand Floridian Resort & Spa (VGF) | VERIFIED | [PDF p. 1](https://documents.disneyvacationclub.com/vision-dam/digital/parks-platform/parks-standard-assets/disney-vacation-club/points/2027_VGF.pdf) | 2027 | 2026-11-02 | `4621c4a25d385fdbc2f68ef9c2bfaa82b2ffbd9a631057494a3ef83fe47d5f8a` |

## Validation and release scope

- Calculator suite: **86 tests passed** (exit code 0). Whole-calendar checks cover all **142,350** date/accommodation combinations across 51 supported charts and detect gaps, overlaps, and missing rates. The CFW source regression checks all 21 period/nightly rate cells for 2025–2027 and the pre-existing 2027 JSON against the printed official tables. The Vero boundary regression tests behavior against the user-supplied dates only; they do not resolve the standalone PDF’s unavailable visual evidence.
- Focused quote/related suite: **36 tests passed** (exit code 0), covering booking quote UI, stay quote flow, and Pixie catalog/identifier/eligibility behavior. A separate prior booking creation route run passed **277 tests**.
- Existing tests also verify checkout exclusion and a stay crossing Dec 31 / Jan 1, with each night using its own year’s chart.
- Calculator package build: **passed** (`pnpm --filter pixiedvc-calculator build`); application production build: **passed** (`pnpm build`, exit code 0). Both emitted existing warnings, including the duplicate `baseUrl` tsconfig key; Next also reports existing metadata and experimental Turbopack warnings.
- The tracked `dist` bundle was regenerated. A read-only source-versus-dist check confirmed all 51 resort/year chart objects are identical; representative pricing quotes also matched between source and generated package output.
- Intended local changes: previously audited AUL/PVB/VDH/BWV/VGF data; new CFW 2025 and 2026 data; CFW registry and shared calculator metadata; calculator selector/quote slug and image mappings; a CFW resort-row migration (not applied); CFW point, period, boundary, and stay tests; audit report and comparison CSV.
- Production comparison/deployment: **not performed**. No production data/configuration changes, booking workflow changes, payments, notifications, or deployment occurred.

The CSV records the previously identified 702 changed numeric rate fields across 424 period/accommodation records, plus 42 source-backed CFW Sun–Thu/Fri–Sat rate entries added for the three years.
