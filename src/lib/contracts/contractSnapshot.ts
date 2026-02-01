export type ContractSnapshot = {
  templateVersion: 'pixie_dvc_v1_1';
  generatedAt: string;

  summary: {
    reservationNumber: string | null;
    resortName: string;
    accommodationType: string;
    checkIn: string;
    checkOut: string;
    pointsRented: number;
    guestPricePerPointCents: number;
    totalPayableByGuestCents: number;
    paidNowRule: string;
    paidNowPercent: number;
    paidNowCents: number;
    balanceOwingCents: number;
    currency: 'USD';
  };

  parties: {
    guest: {
      fullName: string;
      email: string | null;
      phone: string | null;
      address: {
        line1: string | null;
        line2: string | null;
        city: string | null;
        state: string | null;
        postal: string | null;
        country: string | null;
      };
    };
    owner: {
      fullName: string;
      secondOwnerFullName: string | null;
    };
    intermediary: {
      legalName: string;
      address: string;
      tagline: string;
    };
  };

  occupancy: {
    adults: string[];
    youths: string[];
  };
};
