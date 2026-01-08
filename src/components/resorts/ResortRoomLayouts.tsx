"use client";

import { useEffect, useMemo, useState } from "react";

import { ROOM_DEFS } from "@/content/roomAmenities";
import type { LayoutVariant, RoomKey } from "@/lib/villaLayouts";
import { listLayoutsForResort } from "@/lib/villaLayouts";

type ResortRoomLayoutsProps = {
  resortCode: string | null;
};

export default function ResortRoomLayouts({ resortCode }: ResortRoomLayoutsProps) {
  const [layouts, setLayouts] = useState<LayoutVariant[]>([]);
  const [selectedKey, setSelectedKey] = useState<RoomKey | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchLayouts = async () => {
      if (!resortCode) {
        setLayouts([]);
        setIsLoading(false);
        return;
      }

      try {
        const data = await listLayoutsForResort(resortCode);
        if (!isMounted) return;
        setLayouts(data);
        setSelectedKey(data[0]?.key ?? null);
        setActiveIndex(0);
        if (process.env.NODE_ENV === "development") {
          console.log("[villa-layouts] layouts", resortCode, data.map((item) => item.fileName));
        }
      } catch (error) {
        console.error("[villa-layouts] Failed to load layouts", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLayouts();
    return () => {
      isMounted = false;
    };
  }, [resortCode]);

  const selectedLayout = useMemo(() => {
    if (!layouts.length) return null;
    if (!selectedKey) return layouts[0];
    const byKey = layouts.find((layout) => layout.key === selectedKey);
    return byKey ?? layouts[activeIndex] ?? layouts[0];
  }, [activeIndex, layouts, selectedKey]);

  const activeRoomDef = selectedLayout ? ROOM_DEFS[selectedLayout.key] : null;

  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-[#0F2148]/10 bg-white/70 p-6 text-sm text-[#0F2148]/70">
          Loading layouts…
        </div>
      </section>
    );
  }

  if (!layouts.length || !selectedLayout) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-[#0F2148]/10 bg-white/70 p-6 text-sm text-[#0F2148]/70">
          Layouts coming soon.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/60">Villa Layouts</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#0F2148]">Room layouts & amenities</h2>
          <p className="mt-2 text-sm text-[#0F2148]/70">
            Select a room type to preview the floor plan and included amenities.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {layouts.map((layout, index) => {
          const label = ROOM_DEFS[layout.key]?.label ?? layout.label;
          const isActive = layout.key === selectedLayout.key;
          return (
            <button
              key={`${layout.key}-${layout.fileName}`}
              type="button"
              onClick={() => {
                setSelectedKey(layout.key);
                setActiveIndex(index);
              }}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? "border-[#0F2148] bg-[#0F2148] text-white"
                  : "border-[#0F2148]/20 text-[#0F2148]/80 hover:border-[#0F2148]/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-3xl border border-[#0F2148]/10 bg-white shadow-[0_20px_60px_rgba(12,15,44,0.12)]">
          <div className="relative aspect-[16/10] w-full bg-slate-100">
            <img
              src={selectedLayout.imageUrl}
              alt={`${ROOM_DEFS[selectedLayout.key]?.label ?? selectedLayout.label} floor plan`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="border-t border-[#0F2148]/10 px-5 py-4 text-sm text-[#0F2148]/70">
            Floor plan image from resort layout library.
          </div>
        </div>

        <div className="rounded-3xl border border-[#0F2148]/10 bg-white/90 p-6 shadow-[0_20px_60px_rgba(12,15,44,0.08)]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#0F2148]">
              {activeRoomDef?.label ?? selectedLayout.label}
            </h3>
            {activeRoomDef ? (
              <span className="text-xs font-semibold text-[#0F2148]/70">
                Sleeps up to {activeRoomDef.sleeps}
              </span>
            ) : null}
          </div>
          <ul className="mt-4 space-y-3 text-sm text-[#0F2148]/75">
            {(activeRoomDef?.bullets ?? []).map((bullet) => (
              <li key={bullet} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#0F2148]/50" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          {activeRoomDef?.notes ? (
            <p className="mt-4 text-xs text-[#0F2148]/60">{activeRoomDef.notes}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
