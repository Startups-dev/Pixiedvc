export type Prefill = {
  resortId: string;
  resortName: string;
  villaType: string;
  checkIn: string;
  checkOut: string;
  points: number;
  estCash: number;
  secondaryResortId?: string;
  tertiaryResortId?: string;
};

export type OnComplete = (bookingId: string) => void;
