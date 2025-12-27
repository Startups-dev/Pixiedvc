import React from "react";

type Cell = { points: number; totalUSD: number } | null;

export function ResultsTable({
  rows,
  onReserve
}: {
  rows: Array<{
    resortCode: string;
    resortName: string;
    values: Record<string, Cell>;
    roomTypes: string[];
  }>;
  onReserve?: (resortCode: string, room: string) => void;
}) {
  // Collect all unique room types across all resorts to build columns
  const allRoomTypes = new Set<string>();
  rows.forEach(r => r.roomTypes.forEach(rt => allRoomTypes.add(rt)));

  // Order: STUDIO types first, then INNROOM, CABIN, then ONEBR, TWOBR, BUNGALOW, PENTHOUSE, GRANDVILLA, TREEHOUSE, COTTAGE
  const roomOrder = Array.from(allRoomTypes).sort((a, b) => {
    const priority = (room: string) => {
      if (room === "RESORTSTUDIO") return 0;
      if (room === "STUDIO") return 1;
      if (room === "TOWERSTUDIO") return 2;
      if (room === "DUOSTUDIO") return 3;
      if (room === "DELUXESTUDIO") return 4;
      if (room === "GARDENDUOSTUDIO") return 5;
      if (room === "GARDENDELUXESTUDIO") return 6;
      if (room === "INNROOM") return 7;
      if (room === "CABIN") return 8;
      if (room === "ONEBR") return 9;
      if (room === "TWOBR") return 10;
      if (room === "TWOBRBUNGALOW") return 11;
      if (room === "PENTHOUSE") return 12;
      if (room === "GRANDVILLA") return 13;
      if (room === "TREEHOUSE") return 14;
      if (room === "COTTAGE") return 15;
      return 99;
    };
    return priority(a) - priority(b);
  });

  // find top 3 best values
  const allCells: Array<{ usd: number; key: string }> = [];
  rows.forEach(r =>
    Object.entries(r.values).forEach(([room, cell]) => {
      if (cell) {
        allCells.push({ usd: cell.totalUSD, key: `${r.resortCode}:${room}` });
      }
    })
  );
  allCells.sort((a, b) => a.usd - b.usd);
  const topThree = new Set(allCells.slice(0, 3).map(c => c.key));

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="min-w-[760px] w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left p-3">Resort</th>
            {roomOrder.map(col => (
              <th key={col} className="text-right p-3">{label(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.resortCode} className="border-t">
              <td className="p-3 font-medium">{r.resortName}</td>
              {roomOrder.map(room => {
                const cell = r.values[room];
                if (!cell) return <td key={room} className="p-3 text-right text-slate-400">—</td>;
                const cellKey = `${r.resortCode}:${room}`;
                const rank = allCells.findIndex(c => c.key === cellKey) + 1;
                const isBestValue = rank >= 1 && rank <= 3;
                return (
                  <td
                    key={room}
                    className="p-3 text-right cursor-pointer hover:bg-indigo-50 transition-colors"
                    onClick={() => onReserve && onReserve(r.resortCode, room)}
                  >
                    <div className="font-semibold">${cell.totalUSD.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{cell.points} pts</div>
                    <div className="mt-1">
                      {isBestValue && (
                        <span className="inline-block text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          Best Value {rank}
                        </span>
                      )}
                    </div>
                    {onReserve && (
                      <div className="mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onReserve(r.resortCode, room);
                          }}
                          className="text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 transition-colors"
                        >
                          Select →
                        </button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function label(room: string) {
  switch (room) {
    case "STUDIO": return "Deluxe Studio";
    case "RESORTSTUDIO": return "Resort Studio";
    case "TOWERSTUDIO": return "Tower Studio";
    case "DUOSTUDIO": return "Duo Studio";
    case "DELUXESTUDIO": return "Deluxe Studio";
    case "GARDENDUOSTUDIO": return "Garden Room Duo Studio";
    case "GARDENDELUXESTUDIO": return "Garden Room Deluxe Studio";
    case "CABIN": return "Cabin";
    case "ONEBR": return "One Bedroom";
    case "TWOBR": return "Two Bedroom";
    case "TWOBRBUNGALOW": return "Two-Bedroom Bungalow";
    case "PENTHOUSE": return "Two-Bedroom Penthouse Villa";
    case "GRANDVILLA": return "Grand Villa";
    case "TREEHOUSE": return "Three-Bedroom Treehouse Villa";
    case "INNROOM": return "Deluxe Inn Room";
    case "COTTAGE": return "Three-Bedroom Beach Cottage";
    default: return room;
  }
}
