export default function PixieWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h2 className="font-semibold">Planning notes</h2>
      <ul className="mt-2 space-y-1">
        {warnings.slice(0, 4).map((warning) => (
          <li key={warning}>• {warning}</li>
        ))}
      </ul>
    </section>
  );
}

