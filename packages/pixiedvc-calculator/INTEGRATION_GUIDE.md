# Integration Guide: Using pixiedvc-calculator in Next.js

This guide explains how to properly integrate the `pixiedvc-calculator` package into your Next.js application.

## Prerequisites

The package has been restructured to work properly with modern bundlers like Turbopack and Webpack. The key changes made:

1. ✅ **No dynamic JSON imports** - All data is pre-imported via a registry
2. ✅ **Proper ESM exports** - All modules use static imports
3. ✅ **Built with tsup** - Creates a proper distributable package
4. ✅ **Peer dependencies** - React/ReactDOM are peer deps, not bundled

## Installation

### Option 1: Local Development (Recommended for now)

From your Next.js project root:

```bash
npm install ../pixiedvc-calculator
```

### Option 2: Using npm pack

From the calculator directory:

```bash
npm run build
npm pack
```

This creates a `.tgz` file. Then from your Next.js project:

```bash
npm install /path/to/pixiedvc-calculator-1.0.0.tgz
```

## Next.js Configuration

Update your `next.config.js` (or `next.config.mjs`):

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['pixiedvc-calculator'],
  experimental: {
    externalDir: true, // Allow imports from outside the project root
  },
};

export default nextConfig;
```

For Next 15 with Turbopack:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['pixiedvc-calculator'],
  experimental: {
    externalDir: true,
    turbo: {
      resolveAlias: {
        // Ensure proper resolution
        'pixiedvc-calculator': './node_modules/pixiedvc-calculator/dist/index.js',
      },
    },
  },
};

export default nextConfig;
```

## Usage in Your App

### Basic Calculator Component

```tsx
'use client';

import { DvcCalculator } from 'pixiedvc-calculator';

export default function CalculatorPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">DVC Cost Calculator</h1>
      <DvcCalculator />
    </div>
  );
}
```

### Using the Engine Functions

```tsx
'use client';

import { quoteStay, Resorts } from 'pixiedvc-calculator';
import { useState } from 'react';

export default function CustomCalculator() {
  const [quote, setQuote] = useState(null);

  const handleCalculate = () => {
    const result = quoteStay({
      resortCode: 'AKV',
      room: 'STUDIO',
      view: 'SV',
      checkIn: '2025-11-15',
      nights: 7,
    });
    setQuote(result);
  };

  return (
    <div>
      <button onClick={handleCalculate}>Calculate</button>
      {quote && (
        <div>
          <p>Total Points: {quote.totalPoints}</p>
          <p>Total Cost: ${quote.totalUSD.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
```

### Using Data Only

```tsx
import { Resorts, resortsData, getResortYearChart } from 'pixiedvc-calculator';

export function ResortList() {
  return (
    <ul>
      {Resorts.map((resort) => (
        <li key={resort.code}>
          {resort.name} - {resort.category}
        </li>
      ))}
    </ul>
  );
}
```

## Exports

The package exports:

### Components
- `DvcCalculator` - Full calculator UI
- `ResultsTable` - Comparison table component

### Functions
- `quoteStay(input: QuoteInput): QuoteResult` - Calculate points and cost
- `loadResortYearChart(resortCode: string, year: number)` - Get resort data
- `getResortYearChart(resortCode, year)` - Alternative data fetcher

### Data
- `Resorts` - Array of all resort metadata
- `resortsData` - Raw resort data

### Types
All TypeScript types are exported:
- `QuoteInput`
- `QuoteResult`
- `ResortMeta`
- `RoomCode`
- `ViewCode`
- etc.

## Styling

The calculator uses Tailwind CSS classes. Make sure your Next.js app has Tailwind configured.

Required dependencies in your Next.js project:
```bash
npm install @heroicons/react date-fns
```

## Troubleshooting

### "Module not found" errors

Make sure you've:
1. Run `npm run build` in the calculator package
2. Added `transpilePackages: ['pixiedvc-calculator']` to next.config
3. Installed peer dependencies (react, react-dom)

### Type errors

Make sure you have the latest build:
```bash
cd /path/to/pixiedvc-calculator
npm run build
```

Then reinstall in your Next.js project:
```bash
npm install ../pixiedvc-calculator --force
```

### Turbopack issues

If using Next 15 with Turbopack, make sure:
1. The package is built before installing
2. You've set `externalDir: true`
3. All imports are from the package name, not relative paths

## Publishing to npm (Future)

When ready to publish publicly:

```bash
npm run build
npm publish
```

Then users can simply:
```bash
npm install pixiedvc-calculator
```

## Support

For issues specific to the integration, check:
1. The package builds successfully (`npm run build`)
2. The dist folder contains index.js and index.d.ts
3. Your Next.js config includes transpilePackages
4. All peer dependencies are installed
