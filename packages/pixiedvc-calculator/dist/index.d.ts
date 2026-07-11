type RoomCode = "STUDIO" | "ONEBR" | "TWOBR" | "GRANDVILLA" | "DUOSTUDIO" | "DELUXESTUDIO" | "GARDENDUOSTUDIO" | "GARDENDELUXESTUDIO" | "CABIN" | "RESORTSTUDIO" | "TWOBRBUNGALOW" | "PENTHOUSE" | "TREEHOUSE" | "TOWERSTUDIO" | "INNROOM" | "COTTAGE";
type ViewCode = "V" | "S" | "SV" | "C" | "I" | "P" | "O" | "L" | "T" | "R" | "TP" | "PM";
type WeekRate = {
    sunThu: number;
    friSat: number;
};
type TravelPeriod = {
    id: number;
    name: string;
    ranges: Array<{
        start: string;
        end: string;
    }>;
    points: {
        STUDIO?: Partial<Record<ViewCode, WeekRate>>;
        ONEBR?: Partial<Record<ViewCode, WeekRate>>;
        TWOBR?: Partial<Record<ViewCode, WeekRate>>;
        GRANDVILLA?: Partial<Record<ViewCode, WeekRate>>;
        DUOSTUDIO?: Partial<Record<ViewCode, WeekRate>>;
        DELUXESTUDIO?: Partial<Record<ViewCode, WeekRate>>;
        GARDENDUOSTUDIO?: Partial<Record<ViewCode, WeekRate>>;
        GARDENDELUXESTUDIO?: Partial<Record<ViewCode, WeekRate>>;
        CABIN?: Partial<Record<ViewCode, WeekRate>>;
        RESORTSTUDIO?: Partial<Record<ViewCode, WeekRate>>;
        TWOBRBUNGALOW?: Partial<Record<ViewCode, WeekRate>>;
        PENTHOUSE?: Partial<Record<ViewCode, WeekRate>>;
        TREEHOUSE?: Partial<Record<ViewCode, WeekRate>>;
        TOWERSTUDIO?: Partial<Record<ViewCode, WeekRate>>;
        INNROOM?: Partial<Record<ViewCode, WeekRate>>;
        COTTAGE?: Partial<Record<ViewCode, WeekRate>>;
    };
};
type ResortYearChart = {
    resortCode: string;
    year: number;
    periods: TravelPeriod[];
};
type PricingTier = "PREMIER_ACCESS" | "PRIORITY_ACCESS" | "SELECT_ACCESS" | "VALUE_ACCESS";
type ResortMeta = {
    code: string;
    name: string;
    category: PricingTier;
    roomTypes: RoomCode[];
    viewsByRoom: Partial<Record<RoomCode, ViewCode[]>>;
    viewNames: Partial<Record<ViewCode, string>>;
    occupancy?: Partial<Record<RoomCode, number>>;
};
type QuoteInput = {
    resortCode: string;
    room: RoomCode;
    view: ViewCode;
    checkIn: string;
    nights: number;
    year?: number;
    chartYear?: number;
    bookingDate?: string;
};
type QuoteResult = {
    totalPoints: number;
    nightly: Array<{
        date: string;
        points: number;
        periodId: number | null;
    }>;
    pppUSD: number;
    feePct: number;
    baseUSD: number;
    feeUSD: number;
    totalUSD: number;
    pricingTier: string;
};

type PointRateTier = "PREMIER_ACCESS" | "PRIORITY_ACCESS" | "SELECT_ACCESS" | "VALUE_ACCESS";

declare const RATE_BY_CATEGORY: Record<PointRateTier, number>;
declare const TIER_DISPLAY_NAMES: {
    readonly PREMIER_ACCESS: "Premier Access";
    readonly PRIORITY_ACCESS: "Priority Access";
    readonly SELECT_ACCESS: "Select Access";
    readonly VALUE_ACCESS: "Value Access";
};
declare const SERVICE_FEE_PCT = 0;

declare const Resorts: ResortMeta[];
declare function loadResortYearChart(resortCode: string, year: number): ResortYearChart | null;

declare function quoteStay(input: QuoteInput): QuoteResult;
/** For "show all resorts" table: compute STUDIO/ONEBR/TWOBR/GRAND totals per resort */
declare function quoteAllResorts(params: Omit<QuoteInput, "resortCode" | "room" | "view"> & {
    roomViews: Partial<Record<string, {
        room: RoomCode;
        view: ViewCode;
    }[]>>;
}): Promise<Record<string, Partial<Record<RoomCode, QuoteResult>>>>;

declare const resortsData: ResortMeta[];

declare function getResortYearChart(resortCode: string, year: number): ResortYearChart | null;

export { PricingTier, QuoteInput, QuoteResult, RATE_BY_CATEGORY, ResortMeta, ResortYearChart, Resorts, RoomCode, SERVICE_FEE_PCT, TIER_DISPLAY_NAMES, TravelPeriod, ViewCode, WeekRate, getResortYearChart, loadResortYearChart, quoteAllResorts, quoteStay, resortsData };
