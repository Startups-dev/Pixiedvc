export type TaxRateRow = {
  jurisdiction_id: string;
  tax_type: string;
  rate_bps: number;
  applies_to: 'lodging' | 'service_fee' | 'both';
};

export type TaxBreakdownRow = {
  jurisdiction_id: string;
  tax_type: string;
  rate_bps: number;
  tax_cents: number;
};

export type TaxComputation = {
  tax_breakdown: TaxBreakdownRow[];
  total_tax_cents: number;
  warnings: string[];
};

export function computeTaxes(options: {
  total_cents: number | null;
  jurisdiction_id: string | null;
  rates: TaxRateRow[];
}) {
  const warnings: string[] = [];
  const totalCents = options.total_cents;

  if (!options.jurisdiction_id) {
    return { tax_breakdown: [], total_tax_cents: 0, warnings: ['Missing jurisdiction'] };
  }

  if (!totalCents || totalCents <= 0) {
    return { tax_breakdown: [], total_tax_cents: 0, warnings: ['Missing total'] };
  }

  if (options.rates.length === 0) {
    return { tax_breakdown: [], total_tax_cents: 0, warnings: ['No tax rates configured'] };
  }

  const applicableRates = options.rates.filter((rate) =>
    ['lodging', 'both'].includes(rate.applies_to),
  );

  if (applicableRates.length === 0) {
    return { tax_breakdown: [], total_tax_cents: 0, warnings: ['No lodging tax rates'] };
  }

  const breakdown = applicableRates.map((rate) => {
    const taxCents = Math.round((totalCents * rate.rate_bps) / 10000);
    return {
      jurisdiction_id: rate.jurisdiction_id,
      tax_type: rate.tax_type,
      rate_bps: rate.rate_bps,
      tax_cents: taxCents,
    };
  });

  const totalTax = breakdown.reduce((sum, row) => sum + row.tax_cents, 0);

  return {
    tax_breakdown: breakdown,
    total_tax_cents: totalTax,
    warnings,
  } satisfies TaxComputation;
}
