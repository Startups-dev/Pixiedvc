// src/engine/charts.ts
import { resortsData } from "../data/resorts";
import { getResortYearChart } from "../data/chartRegistry";
import type { ResortMeta, ResortYearChart } from "./types";

export const Resorts: ResortMeta[] = resortsData;

export function loadResortYearChart(resortCode: string, year: number): ResortYearChart | null {
  return getResortYearChart(resortCode, year);
}
