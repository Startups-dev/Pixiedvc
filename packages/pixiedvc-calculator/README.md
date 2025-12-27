# PixieDVC Calculator

Stand-alone DVC cost calculator library with React widget.

## Project Structure

```
pixiedvc-calculator/
├─ src/
│  ├─ engine/        # Pure calculation logic (no React)
│  │  ├─ types.ts
│  │  ├─ rates.ts
│  │  ├─ charts.ts
│  │  └─ calc.ts
│  ├─ data/          # Resort point charts by year
│  │  ├─ resorts.json
│  │  ├─ 2025/
│  │  └─ 2026/
│  ├─ ui/            # React components
│  │  └─ DvcCalculator.tsx
│  └─ index.ts
├─ demo/             # Vite demo app
├─ test/             # Unit tests
└─ package.json
```

## Usage

### Install dependencies
```bash
npm install
```

### Build library
```bash
npm run build
```

### Run demo
```bash
npm run demo
```

### Run tests
```bash
npm test
```

## Adding Resort Data

To add point charts for a resort:

1. Create a JSON file in `src/data/{YEAR}/{RESORT_CODE}.json`
2. Follow the `ResortYearChart` schema from `src/engine/types.ts`
3. Add resort metadata to `src/data/resorts.json` if not already present

## API

```typescript
import { quoteStay, quoteAllResorts } from 'pixiedvc-calculator';

// Quote a single stay
const result = await quoteStay({
  resortCode: 'AKV',
  room: 'STUDIO',
  view: 'S',
  checkIn: '2026-09-15',
  nights: 7
});

// Quote all resorts
const allResults = await quoteAllResorts({
  checkIn: '2026-09-15',
  nights: 7,
  roomViews: {
    'AKV': [{ room: 'STUDIO', view: 'S' }]
  }
});
```

## React Component

```tsx
import { DvcCalculator } from 'pixiedvc-calculator';

function App() {
  return <DvcCalculator />;
}
```
