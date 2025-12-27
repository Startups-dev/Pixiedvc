# Quick Start Guide

## Installation

```bash
cd pixiedvc-calculator
npm install
```

## Run the Demo

```bash
npm run demo
```

Open your browser to the URL shown (typically `http://localhost:5173`)

## Test the Calculator

The calculator is now loaded with **Animal Kingdom Villas (AKV)** data for 2025 and 2026.

### Example Test Cases

Try these to verify the calculation engine:

1. **Weekend vs Weekday Test**
   - Resort: Animal Kingdom Villas
   - Room: STUDIO
   - View: S (Standard)
   - Check-in: 2026-09-04 (Friday - Travel Period 1)
   - Nights: 3 (Fri, Sat, Sun)
   - Expected Points: 13 + 13 + 10 = 36 points
   - Expected Cost: 36 × $23/pt = $828 + 7.5% = $890.10

2. **Travel Period Crossing Test**
   - Check-in: 2025-08-30 (Saturday - Travel Period 4)
   - Nights: 3 (Sat Aug 30, Sun Aug 31, Mon Sep 1)
   - Room: STUDIO, View: S
   - Period 4 (Aug 30-31): 15 + 14 = 29 pts
   - Period 1 (Sep 1): 10 pts
   - Total: 39 points

3. **Grand Villa Test**
   - Room: GRANDVILLA
   - View: SV (Savanna - should work)
   - View: C (Concierge - should NOT appear in dropdown)
   - Check-in: 2026-12-25 (Travel Period 7 - peak)
   - Nights: 7
   - Points should be high (127-144 per night range)

## How It Works

### Price Calculation
- **Base Cost** = Total Points × Price Per Point (PPP)
  - PREMIUM resorts: $25/pt
  - REGULAR resorts (AKV): $23/pt
  - ADVANTAGE resorts: $20/pt
- **Service Fee** = Base Cost × 7.5%
- **Total** = Base Cost + Service Fee

### Weekend Detection
- **Fri-Sat** rates apply to Friday and Saturday nights
- **Sun-Thu** rates apply to Sunday through Thursday nights

### Travel Periods
The calculator automatically:
- Detects which travel period each night falls in
- Uses the correct point value for that period
- Sums all nights even if they cross multiple periods
- Shows 0 points for dates outside defined periods

## Adding More Resorts

To add another resort (e.g., Beach Club):

1. Create `src/data/2025/BCV.json` and `src/data/2026/BCV.json`
2. Add resort metadata to `src/data/resorts.json`:
```json
{
  "code": "BCV",
  "name": "Beach Club Villas",
  "category": "PREMIUM",
  "roomTypes": ["STUDIO", "ONEBR", "TWOBR"],
  "viewsByRoom": {
    "STUDIO": ["S", "SV"],
    "ONEBR": ["S", "SV"],
    "TWOBR": ["S", "SV"]
  }
}
```

The calculator will automatically pick up the new resort!
