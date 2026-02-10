import { Card } from "@pixiedvc/design-system";

export type StatTile = {
  label: string;
  value: string;
  helper?: string;
  badge?: {
    label: string;
    className: string;
  };
};

export default function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">{tile.label}</p>
            {tile.badge ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tile.badge.className}`}>
                {tile.badge.label}
              </span>
            ) : null}
          </div>
          <p className="text-3xl font-semibold text-ink">{tile.value}</p>
          {tile.helper ? <p className="text-xs text-muted">{tile.helper}</p> : null}
        </Card>
      ))}
    </section>
  );
}
