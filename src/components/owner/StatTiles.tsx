import { Card } from "@pixiedvc/design-system";

export type StatTile = {
  label: string;
  value: string;
  helper?: string;
};

export default function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">{tile.label}</p>
          <p className="text-3xl font-semibold text-ink">{tile.value}</p>
          {tile.helper ? <p className="text-xs text-muted">{tile.helper}</p> : null}
        </Card>
      ))}
    </section>
  );
}
