import { Resorts } from "pixiedvc-calculator/engine/charts";

import BookingFlowClient from "@/app/book/BookingFlowClient";

const fallbackPrefill = {
  resortId: "UNKNOWN",
  resortName: "DVC Resort",
  villaType: "Villa",
  checkIn: "",
  checkOut: "",
  points: 0,
  estCash: 0,
};

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

function getParam(params: SearchParams, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatVillaType(room?: string, view?: string, resortCode?: string) {
  if (!room && !view) return "Villa";
  const meta = resortCode ? Resorts.find((resort) => resort.code === resortCode) : null;
  const viewName = view && meta?.viewNames?.[view as keyof typeof meta.viewNames] ? meta.viewNames?.[view as keyof typeof meta.viewNames] : view;
  return [room, viewName].filter(Boolean).join(" · ");
}

export default function BookingPage({ searchParams }: { searchParams?: SearchParams }) {
  const resortCode = getParam(searchParams ?? {}, "resort") ?? "";
  const checkIn = getParam(searchParams ?? {}, "checkIn") ?? "";
  const nightsValue = Number.parseInt(getParam(searchParams ?? {}, "nights") ?? "", 10);
  const nights = Number.isFinite(nightsValue) && nightsValue > 0 ? nightsValue : 1;
  const room = getParam(searchParams ?? {}, "room") ?? "";
  const view = getParam(searchParams ?? {}, "view") ?? "";
  const pointsValue = Number.parseInt(getParam(searchParams ?? {}, "points") ?? "", 10);
  const priceValue = Number.parseFloat(getParam(searchParams ?? {}, "price") ?? "");

  const resortMeta = Resorts.find((resort) => resort.code === resortCode);
  const resortName = resortMeta?.name ?? resortCode || fallbackPrefill.resortName;
  const checkOut = checkIn ? addDays(checkIn, nights) : "";

  const prefill = {
    resortId: resortCode || fallbackPrefill.resortId,
    resortName,
    villaType: formatVillaType(room, view, resortCode) || fallbackPrefill.villaType,
    checkIn,
    checkOut,
    points: Number.isFinite(pointsValue) ? pointsValue : 0,
    estCash: Number.isFinite(priceValue) ? priceValue : 0,
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <main className="mx-auto max-w-5xl px-6 py-20">
        <BookingFlowClient prefill={prefill} />
      </main>
    </div>
  );
}
