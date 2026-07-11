// src/engine/pointRates.ts
var POINT_RATE_BY_TIER = {
  PREMIER_ACCESS: 29,
  PRIORITY_ACCESS: 26,
  SELECT_ACCESS: 24,
  VALUE_ACCESS: 22
};

// src/engine/rates.ts
var RATE_BY_CATEGORY = POINT_RATE_BY_TIER;
var TIER_DISPLAY_NAMES = {
  PREMIER_ACCESS: "Premier Access",
  PRIORITY_ACCESS: "Priority Access",
  SELECT_ACCESS: "Select Access",
  VALUE_ACCESS: "Value Access"
};
var SERVICE_FEE_PCT = 0;

// src/data/resorts.ts
var resortsData = [
  {
    code: "AKV",
    name: "Animal Kingdom Villas",
    category: "SELECT_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      STUDIO: ["V", "R", "SV", "C"],
      ONEBR: ["V", "R", "SV", "C"],
      TWOBR: ["V", "R", "SV", "C"],
      GRANDVILLA: ["R", "SV"]
    },
    viewNames: {
      V: "Value Accommodation",
      R: "Resort View",
      SV: "Savanna View",
      C: "Kilimanjaro Club Concierge"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  },
  {
    code: "AUL",
    name: "Aulani, Ko Olina, Hawai'i",
    category: "PRIORITY_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      STUDIO: ["S", "I", "P", "O"],
      ONEBR: ["S", "I", "P", "O"],
      TWOBR: ["S", "I", "P", "O"],
      GRANDVILLA: ["S", "O"]
    },
    viewNames: {
      S: "Standard View",
      I: "Island Gardens View",
      P: "Poolside Gardens View",
      O: "Ocean View"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  },
  {
    code: "BLT",
    name: "Bay Lake Tower at Contemporary Resort",
    category: "SELECT_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      STUDIO: ["S", "L", "T"],
      ONEBR: ["S", "L", "T"],
      TWOBR: ["S", "L", "T"],
      GRANDVILLA: ["L", "T"]
    },
    viewNames: {
      S: "Standard View",
      L: "Lake View",
      T: "Theme Park View"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  },
  {
    code: "BCV",
    name: "Beach Club Villas",
    category: "PREMIER_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR"],
    viewsByRoom: {
      STUDIO: ["S"],
      ONEBR: ["S"],
      TWOBR: ["S"]
    },
    viewNames: {
      S: "Standard"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9
    }
  },
  {
    code: "BWV",
    name: "Boardwalk Villas",
    category: "PRIORITY_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      STUDIO: ["S", "P"],
      ONEBR: ["S", "P"],
      TWOBR: ["S", "P"],
      GRANDVILLA: ["P"]
    },
    viewNames: {
      S: "Standard View",
      P: "Boardwalk/Preferred View"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  },
  {
    code: "BRV",
    name: "Boulder Ridge Villas at Disney's Wilderness Lodge",
    category: "SELECT_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR"],
    viewsByRoom: {
      STUDIO: ["S"],
      ONEBR: ["S"],
      TWOBR: ["S"]
    },
    viewNames: {
      S: "Standard"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9
    }
  },
  {
    code: "HHI",
    name: "Disney's Hilton Head Island Resort",
    category: "VALUE_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      STUDIO: ["S"],
      ONEBR: ["S"],
      TWOBR: ["S"],
      GRANDVILLA: ["S"]
    },
    viewNames: {
      S: "Standard"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 8,
      GRANDVILLA: 12
    }
  },
  {
    code: "OKW",
    name: "Disney's Old Key West Resort",
    category: "VALUE_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      STUDIO: ["S"],
      ONEBR: ["S"],
      TWOBR: ["S"],
      GRANDVILLA: ["S"]
    },
    viewNames: {
      S: "Standard"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  },
  {
    code: "PVB",
    name: "Disney's Polynesian Villas & Bungalows",
    category: "PREMIER_ACCESS",
    roomTypes: ["STUDIO", "DUOSTUDIO", "DELUXESTUDIO", "ONEBR", "TWOBR", "TWOBRBUNGALOW", "PENTHOUSE"],
    viewsByRoom: {
      STUDIO: ["R"],
      DUOSTUDIO: ["R", "P", "PM"],
      DELUXESTUDIO: ["R", "P", "TP"],
      ONEBR: ["R", "P", "TP"],
      TWOBR: ["R", "P", "TP"],
      TWOBRBUNGALOW: ["P"],
      PENTHOUSE: ["P", "TP"]
    },
    viewNames: {
      R: "Resort View",
      P: "Preferred View",
      TP: "Theme Park View",
      PM: "Premium View"
    },
    occupancy: {
      STUDIO: 4,
      DUOSTUDIO: 2,
      DELUXESTUDIO: 5,
      ONEBR: 5,
      TWOBR: 9,
      TWOBRBUNGALOW: 8,
      PENTHOUSE: 8
    }
  },
  {
    code: "RVA",
    name: "Disney's Riviera Resort",
    category: "SELECT_ACCESS",
    roomTypes: ["TOWERSTUDIO", "DELUXESTUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      TOWERSTUDIO: ["S"],
      DELUXESTUDIO: ["S", "P"],
      ONEBR: ["S", "P"],
      TWOBR: ["S", "P"],
      GRANDVILLA: ["P"]
    },
    viewNames: {
      S: "Standard View",
      P: "Preferred View"
    },
    occupancy: {
      TOWERSTUDIO: 2,
      DELUXESTUDIO: 5,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  },
  {
    code: "SSR",
    name: "Saratoga Springs Resort & Spa",
    category: "VALUE_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA", "TREEHOUSE"],
    viewsByRoom: {
      STUDIO: ["S", "P"],
      ONEBR: ["S", "P"],
      TWOBR: ["S", "P"],
      GRANDVILLA: ["S", "P"],
      TREEHOUSE: ["S"]
    },
    viewNames: {
      S: "Standard",
      P: "Preferred"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12,
      TREEHOUSE: 9
    }
  },
  {
    code: "VB",
    name: "Disney's Vero Beach Resort",
    category: "VALUE_ACCESS",
    roomTypes: ["INNROOM", "STUDIO", "ONEBR", "TWOBR", "COTTAGE"],
    viewsByRoom: {
      INNROOM: ["S", "O"],
      STUDIO: ["S"],
      ONEBR: ["S"],
      TWOBR: ["S"],
      COTTAGE: ["S"]
    },
    viewNames: {
      S: "Standard View",
      O: "Ocean View"
    },
    occupancy: {
      INNROOM: 4,
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 8,
      COTTAGE: 8
    }
  },
  {
    code: "CCV",
    name: "Copper Creek Villas & Cabins at Disney's Wilderness Lodge",
    category: "SELECT_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA", "CABIN"],
    viewsByRoom: {
      STUDIO: ["S"],
      ONEBR: ["S"],
      TWOBR: ["S"],
      GRANDVILLA: ["S"],
      CABIN: ["S"]
    },
    viewNames: {
      S: "Standard"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12,
      CABIN: 8
    }
  },
  {
    code: "VDH",
    name: "The Villas at Disneyland Hotel",
    category: "PRIORITY_ACCESS",
    roomTypes: ["DUOSTUDIO", "DELUXESTUDIO", "GARDENDUOSTUDIO", "GARDENDELUXESTUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      DUOSTUDIO: ["S", "P"],
      DELUXESTUDIO: ["S", "P"],
      GARDENDUOSTUDIO: ["S"],
      GARDENDELUXESTUDIO: ["S"],
      ONEBR: ["S", "P"],
      TWOBR: ["S", "P"],
      GRANDVILLA: ["S", "P"]
    },
    viewNames: {
      S: "Standard View",
      P: "Preferred View"
    },
    occupancy: {
      DUOSTUDIO: 2,
      DELUXESTUDIO: 5,
      GARDENDUOSTUDIO: 2,
      GARDENDELUXESTUDIO: 5,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  },
  {
    code: "VGC",
    name: "The Villas at Disney's Grand Californian Hotel & Spa",
    category: "PRIORITY_ACCESS",
    roomTypes: ["STUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      STUDIO: ["S"],
      ONEBR: ["S"],
      TWOBR: ["S"],
      GRANDVILLA: ["S"]
    },
    viewNames: {
      S: "Standard"
    },
    occupancy: {
      STUDIO: 4,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  },
  {
    code: "VGF",
    name: "The Villas at Disney's Grand Floridian Resort & Spa",
    category: "PRIORITY_ACCESS",
    roomTypes: ["RESORTSTUDIO", "STUDIO", "ONEBR", "TWOBR", "GRANDVILLA"],
    viewsByRoom: {
      RESORTSTUDIO: ["R", "P", "TP"],
      STUDIO: ["R", "P"],
      ONEBR: ["R", "P"],
      TWOBR: ["R", "P"],
      GRANDVILLA: ["P"]
    },
    viewNames: {
      R: "Resort View",
      P: "Preferred View",
      TP: "Theme Park View"
    },
    occupancy: {
      RESORTSTUDIO: 2,
      STUDIO: 5,
      ONEBR: 5,
      TWOBR: 9,
      GRANDVILLA: 12
    }
  }
];

// src/data/2025/AKV.json
var AKV_default = {
  resortCode: "AKV",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 7, friSat: 10 },
          R: { sunThu: 10, friSat: 13 },
          SV: { sunThu: 13, friSat: 16 },
          C: { sunThu: 18, friSat: 22 }
        },
        ONEBR: {
          V: { sunThu: 17, friSat: 20 },
          R: { sunThu: 20, friSat: 25 },
          SV: { sunThu: 27, friSat: 31 },
          C: { sunThu: 38, friSat: 43 }
        },
        TWOBR: {
          V: { sunThu: 22, friSat: 28 },
          R: { sunThu: 28, friSat: 34 },
          SV: { sunThu: 35, friSat: 43 },
          C: { sunThu: 51, friSat: 58 }
        },
        GRANDVILLA: {
          R: { sunThu: 68, friSat: 78 },
          SV: { sunThu: 73, friSat: 85 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 8, friSat: 11 },
          R: { sunThu: 12, friSat: 14 },
          SV: { sunThu: 15, friSat: 17 },
          C: { sunThu: 20, friSat: 23 }
        },
        ONEBR: {
          V: { sunThu: 19, friSat: 21 },
          R: { sunThu: 24, friSat: 28 },
          SV: { sunThu: 31, friSat: 34 },
          C: { sunThu: 41, friSat: 46 }
        },
        TWOBR: {
          V: { sunThu: 25, friSat: 31 },
          R: { sunThu: 31, friSat: 37 },
          SV: { sunThu: 39, friSat: 48 },
          C: { sunThu: 55, friSat: 63 }
        },
        GRANDVILLA: {
          R: { sunThu: 73, friSat: 82 },
          SV: { sunThu: 79, friSat: 89 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 8, friSat: 12 },
          R: { sunThu: 13, friSat: 15 },
          SV: { sunThu: 16, friSat: 18 },
          C: { sunThu: 21, friSat: 24 }
        },
        ONEBR: {
          V: { sunThu: 20, friSat: 22 },
          R: { sunThu: 26, friSat: 29 },
          SV: { sunThu: 33, friSat: 35 },
          C: { sunThu: 43, friSat: 49 }
        },
        TWOBR: {
          V: { sunThu: 27, friSat: 32 },
          R: { sunThu: 32, friSat: 39 },
          SV: { sunThu: 42, friSat: 50 },
          C: { sunThu: 58, friSat: 66 }
        },
        GRANDVILLA: {
          R: { sunThu: 78, friSat: 88 },
          SV: { sunThu: 86, friSat: 96 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 9, friSat: 12 },
          R: { sunThu: 14, friSat: 15 },
          SV: { sunThu: 17, friSat: 20 },
          C: { sunThu: 22, friSat: 24 }
        },
        ONEBR: {
          V: { sunThu: 21, friSat: 24 },
          R: { sunThu: 27, friSat: 30 },
          SV: { sunThu: 34, friSat: 36 },
          C: { sunThu: 44, friSat: 50 }
        },
        TWOBR: {
          V: { sunThu: 29, friSat: 34 },
          R: { sunThu: 35, friSat: 40 },
          SV: { sunThu: 43, friSat: 52 },
          C: { sunThu: 60, friSat: 66 }
        },
        GRANDVILLA: {
          R: { sunThu: 81, friSat: 91 },
          SV: { sunThu: 89, friSat: 100 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 10, friSat: 13 },
          R: { sunThu: 15, friSat: 16 },
          SV: { sunThu: 19, friSat: 20 },
          C: { sunThu: 23, friSat: 25 }
        },
        ONEBR: {
          V: { sunThu: 23, friSat: 26 },
          R: { sunThu: 29, friSat: 32 },
          SV: { sunThu: 35, friSat: 39 },
          C: { sunThu: 46, friSat: 53 }
        },
        TWOBR: {
          V: { sunThu: 30, friSat: 35 },
          R: { sunThu: 36, friSat: 44 },
          SV: { sunThu: 47, friSat: 57 },
          C: { sunThu: 61, friSat: 71 }
        },
        GRANDVILLA: {
          R: { sunThu: 88, friSat: 100 },
          SV: { sunThu: 96, friSat: 110 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 12, friSat: 14 },
          R: { sunThu: 16, friSat: 18 },
          SV: { sunThu: 19, friSat: 22 },
          C: { sunThu: 23, friSat: 26 }
        },
        ONEBR: {
          V: { sunThu: 24, friSat: 27 },
          R: { sunThu: 32, friSat: 35 },
          SV: { sunThu: 38, friSat: 41 },
          C: { sunThu: 49, friSat: 56 }
        },
        TWOBR: {
          V: { sunThu: 31, friSat: 36 },
          R: { sunThu: 40, friSat: 48 },
          SV: { sunThu: 52, friSat: 61 },
          C: { sunThu: 66, friSat: 77 }
        },
        GRANDVILLA: {
          R: { sunThu: 97, friSat: 111 },
          SV: { sunThu: 107, friSat: 121 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 16, friSat: 17 },
          R: { sunThu: 21, friSat: 23 },
          SV: { sunThu: 27, friSat: 29 },
          C: { sunThu: 33, friSat: 36 }
        },
        ONEBR: {
          V: { sunThu: 31, friSat: 35 },
          R: { sunThu: 38, friSat: 45 },
          SV: { sunThu: 47, friSat: 52 },
          C: { sunThu: 65, friSat: 73 }
        },
        TWOBR: {
          V: { sunThu: 43, friSat: 48 },
          R: { sunThu: 55, friSat: 60 },
          SV: { sunThu: 70, friSat: 76 },
          C: { sunThu: 88, friSat: 98 }
        },
        GRANDVILLA: {
          R: { sunThu: 117, friSat: 135 },
          SV: { sunThu: 127, friSat: 144 }
        }
      }
    }
  ]
};

// src/data/2025/AUL.json
var AUL_default = {
  resortCode: "AUL",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-01-05", end: "2025-02-25" },
        { start: "2025-08-31", end: "2025-10-11" },
        { start: "2025-11-11", end: "2025-11-24" },
        { start: "2025-11-30", end: "2025-12-18" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 17 },
          I: { sunThu: 19, friSat: 19 },
          P: { sunThu: 23, friSat: 23 },
          O: { sunThu: 25, friSat: 25 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 34 },
          I: { sunThu: 35, friSat: 35 },
          P: { sunThu: 44, friSat: 44 },
          O: { sunThu: 46, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 47, friSat: 47 },
          I: { sunThu: 49, friSat: 49 },
          P: { sunThu: 59, friSat: 59 },
          O: { sunThu: 62, friSat: 62 }
        },
        GRANDVILLA: {
          S: { sunThu: 95, friSat: 95 },
          O: { sunThu: 122, friSat: 122 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-04-27", end: "2025-04-28" },
        { start: "2025-05-06", end: "2025-06-29" },
        { start: "2025-10-12", end: "2025-11-10" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 19, friSat: 19 },
          I: { sunThu: 21, friSat: 21 },
          P: { sunThu: 24, friSat: 24 },
          O: { sunThu: 26, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 37 },
          I: { sunThu: 44, friSat: 44 },
          P: { sunThu: 46, friSat: 46 },
          O: { sunThu: 50, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 51, friSat: 51 },
          I: { sunThu: 59, friSat: 59 },
          P: { sunThu: 62, friSat: 62 },
          O: { sunThu: 69, friSat: 69 }
        },
        GRANDVILLA: {
          S: { sunThu: 103, friSat: 103 },
          O: { sunThu: 134, friSat: 134 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-02-23", end: "2025-04-10" },
        { start: "2025-08-11", end: "2025-08-30" },
        { start: "2025-11-25", end: "2025-11-29" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 22, friSat: 22 },
          I: { sunThu: 25, friSat: 25 },
          P: { sunThu: 26, friSat: 26 },
          O: { sunThu: 29, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 44, friSat: 44 },
          I: { sunThu: 46, friSat: 46 },
          P: { sunThu: 50, friSat: 50 },
          O: { sunThu: 58, friSat: 58 }
        },
        TWOBR: {
          S: { sunThu: 60, friSat: 60 },
          I: { sunThu: 62, friSat: 62 },
          P: { sunThu: 70, friSat: 70 },
          O: { sunThu: 79, friSat: 79 }
        },
        GRANDVILLA: {
          S: { sunThu: 121, friSat: 121 },
          O: { sunThu: 157, friSat: 157 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-01-01", end: "2025-01-04" },
        { start: "2025-04-11", end: "2025-04-26" },
        { start: "2025-04-29", end: "2025-05-05" },
        { start: "2025-06-30", end: "2025-08-10" },
        { start: "2025-12-19", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 24, friSat: 24 },
          I: { sunThu: 27, friSat: 27 },
          P: { sunThu: 29, friSat: 29 },
          O: { sunThu: 31, friSat: 31 }
        },
        ONEBR: {
          S: { sunThu: 46, friSat: 46 },
          I: { sunThu: 50, friSat: 50 },
          P: { sunThu: 58, friSat: 58 },
          O: { sunThu: 62, friSat: 62 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 64 },
          I: { sunThu: 71, friSat: 71 },
          P: { sunThu: 79, friSat: 79 },
          O: { sunThu: 84, friSat: 84 }
        },
        GRANDVILLA: {
          S: { sunThu: 140, friSat: 140 },
          O: { sunThu: 184, friSat: 184 }
        }
      }
    }
  ]
};

// src/data/2025/BCV.json
var BCV_default = {
  resortCode: "BCV",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 43 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 33 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 46 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 38 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 47 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 52 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 48, friSat: 55 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 27, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 51, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 68, friSat: 71 }
        }
      }
    }
  ]
};

// src/data/2025/BLT.json
var BLT_default = {
  resortCode: "BLT",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 16 },
          L: { sunThu: 16, friSat: 19 },
          T: { sunThu: 18, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 32 },
          L: { sunThu: 29, friSat: 36 },
          T: { sunThu: 35, friSat: 44 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 42 },
          L: { sunThu: 38, friSat: 47 },
          T: { sunThu: 48, friSat: 59 }
        },
        GRANDVILLA: {
          L: { sunThu: 82, friSat: 98 },
          T: { sunThu: 101, friSat: 120 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 17 },
          L: { sunThu: 18, friSat: 19 },
          T: { sunThu: 20, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 35 },
          L: { sunThu: 33, friSat: 38 },
          T: { sunThu: 39, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 40, friSat: 45 },
          L: { sunThu: 43, friSat: 50 },
          T: { sunThu: 54, friSat: 61 }
        },
        GRANDVILLA: {
          L: { sunThu: 88, friSat: 104 },
          T: { sunThu: 106, friSat: 125 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 },
          L: { sunThu: 19, friSat: 20 },
          T: { sunThu: 21, friSat: 25 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 38 },
          L: { sunThu: 35, friSat: 41 },
          T: { sunThu: 41, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 42, friSat: 48 },
          L: { sunThu: 46, friSat: 54 },
          T: { sunThu: 57, friSat: 66 }
        },
        GRANDVILLA: {
          L: { sunThu: 96, friSat: 112 },
          T: { sunThu: 115, friSat: 135 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 19 },
          L: { sunThu: 19, friSat: 21 },
          T: { sunThu: 23, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 39 },
          L: { sunThu: 36, friSat: 44 },
          T: { sunThu: 45, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 },
          L: { sunThu: 47, friSat: 58 },
          T: { sunThu: 58, friSat: 67 }
        },
        GRANDVILLA: {
          L: { sunThu: 100, friSat: 115 },
          T: { sunThu: 120, friSat: 141 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 21 },
          L: { sunThu: 20, friSat: 23 },
          T: { sunThu: 24, friSat: 27 }
        },
        ONEBR: {
          S: { sunThu: 33, friSat: 41 },
          L: { sunThu: 38, friSat: 47 },
          T: { sunThu: 47, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 45, friSat: 53 },
          L: { sunThu: 50, friSat: 61 },
          T: { sunThu: 60, friSat: 72 }
        },
        GRANDVILLA: {
          L: { sunThu: 108, friSat: 126 },
          T: { sunThu: 131, friSat: 153 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 19, friSat: 22 },
          L: { sunThu: 21, friSat: 24 },
          T: { sunThu: 26, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 44 },
          L: { sunThu: 42, friSat: 48 },
          T: { sunThu: 49, friSat: 59 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 57 },
          L: { sunThu: 54, friSat: 62 },
          T: { sunThu: 65, friSat: 76 }
        },
        GRANDVILLA: {
          L: { sunThu: 120, friSat: 140 },
          T: { sunThu: 143, friSat: 168 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 29 },
          L: { sunThu: 28, friSat: 32 },
          T: { sunThu: 34, friSat: 38 }
        },
        ONEBR: {
          S: { sunThu: 48, friSat: 56 },
          L: { sunThu: 53, friSat: 62 },
          T: { sunThu: 64, friSat: 75 }
        },
        TWOBR: {
          S: { sunThu: 66, friSat: 77 },
          L: { sunThu: 72, friSat: 84 },
          T: { sunThu: 88, friSat: 98 }
        },
        GRANDVILLA: {
          L: { sunThu: 146, friSat: 171 },
          T: { sunThu: 176, friSat: 207 }
        }
      }
    }
  ]
};

// src/data/2025/BRV.json
var BRV_default = {
  resortCode: "BRV",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 27, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 41 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 32, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 48 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 20 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 51 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 19, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 49, friSat: 54 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 47, friSat: 55 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 72 }
        }
      }
    }
  ]
};

// src/data/2025/BWV.json
var BWV_default = {
  resortCode: "BWV",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 13 },
          P: { sunThu: 14, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 19, friSat: 27 },
          P: { sunThu: 26, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 29, friSat: 35 },
          P: { sunThu: 35, friSat: 40 }
        },
        GRANDVILLA: {
          P: { sunThu: 76, friSat: 88 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 14 },
          P: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 23, friSat: 28 },
          P: { sunThu: 29, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 32, friSat: 38 },
          P: { sunThu: 39, friSat: 45 }
        },
        GRANDVILLA: {
          P: { sunThu: 81, friSat: 91 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 15 },
          P: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 30 },
          P: { sunThu: 32, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 31, friSat: 41 },
          P: { sunThu: 41, friSat: 47 }
        },
        GRANDVILLA: {
          P: { sunThu: 88, friSat: 97 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 12, friSat: 16 },
          P: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 31 },
          P: { sunThu: 35, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 44 },
          P: { sunThu: 43, friSat: 47 }
        },
        GRANDVILLA: {
          P: { sunThu: 91, friSat: 102 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 18, friSat: 20 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 33 },
          P: { sunThu: 35, friSat: 41 }
        },
        TWOBR: {
          S: { sunThu: 39, friSat: 45 },
          P: { sunThu: 45, friSat: 51 }
        },
        GRANDVILLA: {
          P: { sunThu: 101, friSat: 114 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 19 },
          P: { sunThu: 19, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 },
          P: { sunThu: 39, friSat: 43 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 },
          P: { sunThu: 51, friSat: 55 }
        },
        GRANDVILLA: {
          P: { sunThu: 110, friSat: 124 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 22, friSat: 24 },
          P: { sunThu: 28, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 42, friSat: 48 },
          P: { sunThu: 50, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 60, friSat: 67 },
          P: { sunThu: 68, friSat: 77 }
        },
        GRANDVILLA: {
          P: { sunThu: 133, friSat: 145 }
        }
      }
    }
  ]
};

// src/data/2025/CCV.json
var CCV_default = {
  resortCode: "CCV",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 40 }
        },
        GRANDVILLA: {
          S: { sunThu: 91, friSat: 107 }
        },
        CABIN: {
          S: { sunThu: 84, friSat: 100 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        },
        GRANDVILLA: {
          S: { sunThu: 101, friSat: 116 }
        },
        CABIN: {
          S: { sunThu: 94, friSat: 109 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 33, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 }
        },
        GRANDVILLA: {
          S: { sunThu: 108, friSat: 124 }
        },
        CABIN: {
          S: { sunThu: 101, friSat: 117 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 38 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 }
        },
        GRANDVILLA: {
          S: { sunThu: 113, friSat: 130 }
        },
        CABIN: {
          S: { sunThu: 107, friSat: 121 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 45, friSat: 52 }
        },
        GRANDVILLA: {
          S: { sunThu: 120, friSat: 137 }
        },
        CABIN: {
          S: { sunThu: 113, friSat: 131 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 43 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 128, friSat: 147 }
        },
        CABIN: {
          S: { sunThu: 124, friSat: 143 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 25, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 48, friSat: 54 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 72 }
        },
        GRANDVILLA: {
          S: { sunThu: 176, friSat: 206 }
        },
        CABIN: {
          S: { sunThu: 171, friSat: 196 }
        }
      }
    }
  ]
};

// src/data/2025/HHI.json
var HHI_default = {
  resortCode: "HHI",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-12-01", end: "2025-12-17" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 6, friSat: 12 }
        },
        ONEBR: {
          S: { sunThu: 14, friSat: 19 }
        },
        TWOBR: {
          S: { sunThu: 20, friSat: 23 }
        },
        GRANDVILLA: {
          S: { sunThu: 27, friSat: 39 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-02-01", end: "2025-03-31" },
        { start: "2025-11-01", end: "2025-11-30" },
        { start: "2025-12-18", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 20, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 24, friSat: 36 }
        },
        GRANDVILLA: {
          S: { sunThu: 47, friSat: 60 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-04-01", end: "2025-06-10" },
        { start: "2025-08-28", end: "2025-10-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 27, friSat: 44 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 59, friSat: 95 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-06-11", end: "2025-08-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 27 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 52 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 66 }
        },
        GRANDVILLA: {
          S: { sunThu: 71, friSat: 111 }
        }
      }
    }
  ]
};

// src/data/2025/OKW.json
var OKW_default = {
  resortCode: "OKW",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 13 }
        },
        ONEBR: {
          S: { sunThu: 20, friSat: 25 }
        },
        TWOBR: {
          S: { sunThu: 27, friSat: 35 }
        },
        GRANDVILLA: {
          S: { sunThu: 46, friSat: 56 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 14 }
        },
        ONEBR: {
          S: { sunThu: 23, friSat: 26 }
        },
        TWOBR: {
          S: { sunThu: 31, friSat: 35 }
        },
        GRANDVILLA: {
          S: { sunThu: 50, friSat: 59 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 28 }
        },
        TWOBR: {
          S: { sunThu: 34, friSat: 38 }
        },
        GRANDVILLA: {
          S: { sunThu: 53, friSat: 64 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 11, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 41 }
        },
        GRANDVILLA: {
          S: { sunThu: 56, friSat: 69 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 39, friSat: 44 }
        },
        GRANDVILLA: {
          S: { sunThu: 59, friSat: 71 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 42, friSat: 49 }
        },
        GRANDVILLA: {
          S: { sunThu: 66, friSat: 79 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 22, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 40, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 57, friSat: 65 }
        },
        GRANDVILLA: {
          S: { sunThu: 82, friSat: 106 }
        }
      }
    }
  ]
};

// src/data/2025/PVB.json
var PVB_default = {
  resortCode: "PVB",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 14, friSat: 17 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 112, friSat: 132 }
        },
        DUOSTUDIO: {
          R: { sunThu: 12, friSat: 16 },
          P: { sunThu: 16, friSat: 19 },
          PM: { sunThu: 19, friSat: 21 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 14, friSat: 19 },
          P: { sunThu: 19, friSat: 24 },
          TP: { sunThu: 24, friSat: 27 }
        },
        ONEBR: {
          R: { sunThu: 28, friSat: 38 },
          P: { sunThu: 38, friSat: 45 },
          TP: { sunThu: 47, friSat: 52 }
        },
        TWOBR: {
          R: { sunThu: 42, friSat: 53 },
          P: { sunThu: 53, friSat: 63 },
          TP: { sunThu: 64, friSat: 75 }
        },
        PENTHOUSE: {
          P: { sunThu: 86, friSat: 104 },
          TP: { sunThu: 108, friSat: 126 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 17, friSat: 20 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 120, friSat: 139 }
        },
        DUOSTUDIO: {
          R: { sunThu: 14, friSat: 18 },
          P: { sunThu: 18, friSat: 20 },
          PM: { sunThu: 21, friSat: 24 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 17, friSat: 22 },
          P: { sunThu: 22, friSat: 26 },
          TP: { sunThu: 27, friSat: 30 }
        },
        ONEBR: {
          R: { sunThu: 34, friSat: 42 },
          P: { sunThu: 42, friSat: 48 },
          TP: { sunThu: 50, friSat: 56 }
        },
        TWOBR: {
          R: { sunThu: 47, friSat: 54 },
          P: { sunThu: 54, friSat: 66 },
          TP: { sunThu: 71, friSat: 82 }
        },
        PENTHOUSE: {
          P: { sunThu: 95, friSat: 110 },
          TP: { sunThu: 117, friSat: 135 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 18, friSat: 22 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 128, friSat: 147 }
        },
        DUOSTUDIO: {
          R: { sunThu: 16, friSat: 19 },
          P: { sunThu: 19, friSat: 21 },
          PM: { sunThu: 22, friSat: 26 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 19, friSat: 22 },
          P: { sunThu: 22, friSat: 26 },
          TP: { sunThu: 27, friSat: 32 }
        },
        ONEBR: {
          R: { sunThu: 38, friSat: 47 },
          P: { sunThu: 47, friSat: 52 },
          TP: { sunThu: 53, friSat: 61 }
        },
        TWOBR: {
          R: { sunThu: 54, friSat: 63 },
          P: { sunThu: 63, friSat: 67 },
          TP: { sunThu: 82, friSat: 97 }
        },
        PENTHOUSE: {
          P: { sunThu: 102, friSat: 119 },
          TP: { sunThu: 122, friSat: 144 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 20, friSat: 23 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 136, friSat: 157 }
        },
        DUOSTUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 19, friSat: 22 },
          PM: { sunThu: 24, friSat: 27 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 20, friSat: 24 },
          P: { sunThu: 24, friSat: 27 },
          TP: { sunThu: 29, friSat: 35 }
        },
        ONEBR: {
          R: { sunThu: 40, friSat: 48 },
          P: { sunThu: 48, friSat: 54 },
          TP: { sunThu: 56, friSat: 63 }
        },
        TWOBR: {
          R: { sunThu: 56, friSat: 65 },
          P: { sunThu: 65, friSat: 79 },
          TP: { sunThu: 88, friSat: 98 }
        },
        PENTHOUSE: {
          P: { sunThu: 108, friSat: 122 },
          TP: { sunThu: 128, friSat: 162 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 22, friSat: 26 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 160, friSat: 172 }
        },
        DUOSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 20, friSat: 24 },
          PM: { sunThu: 26, friSat: 29 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 22, friSat: 25 },
          P: { sunThu: 25, friSat: 30 },
          TP: { sunThu: 31, friSat: 38 }
        },
        ONEBR: {
          R: { sunThu: 44, friSat: 53 },
          P: { sunThu: 53, friSat: 60 },
          TP: { sunThu: 62, friSat: 70 }
        },
        TWOBR: {
          R: { sunThu: 62, friSat: 70 },
          P: { sunThu: 70, friSat: 84 },
          TP: { sunThu: 90, friSat: 101 }
        },
        PENTHOUSE: {
          P: { sunThu: 115, friSat: 132 },
          TP: { sunThu: 140, friSat: 162 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 25, friSat: 28 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 162, friSat: 185 }
        },
        DUOSTUDIO: {
          R: { sunThu: 20, friSat: 23 },
          P: { sunThu: 22, friSat: 26 },
          PM: { sunThu: 28, friSat: 32 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 25, friSat: 28 },
          P: { sunThu: 28, friSat: 32 },
          TP: { sunThu: 34, friSat: 39 }
        },
        ONEBR: {
          R: { sunThu: 48, friSat: 54 },
          P: { sunThu: 54, friSat: 64 },
          TP: { sunThu: 69, friSat: 75 }
        },
        TWOBR: {
          R: { sunThu: 68, friSat: 75 },
          P: { sunThu: 75, friSat: 90 },
          TP: { sunThu: 96, friSat: 119 }
        },
        PENTHOUSE: {
          P: { sunThu: 126, friSat: 144 },
          TP: { sunThu: 153, friSat: 179 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 34, friSat: 38 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 199, friSat: 226 }
        },
        DUOSTUDIO: {
          R: { sunThu: 27, friSat: 32 },
          P: { sunThu: 30, friSat: 36 },
          PM: { sunThu: 39, friSat: 43 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 34, friSat: 41 },
          P: { sunThu: 41, friSat: 43 },
          TP: { sunThu: 48, friSat: 53 }
        },
        ONEBR: {
          R: { sunThu: 68, friSat: 78 },
          P: { sunThu: 78, friSat: 86 },
          TP: { sunThu: 89, friSat: 105 }
        },
        TWOBR: {
          R: { sunThu: 92, friSat: 105 },
          P: { sunThu: 105, friSat: 129 },
          TP: { sunThu: 149, friSat: 175 }
        },
        PENTHOUSE: {
          P: { sunThu: 178, friSat: 198 },
          TP: { sunThu: 197, friSat: 229 }
        }
      }
    }
  ]
};

// src/data/2025/RVA.json
var RVA_default = {
  resortCode: "RVA",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 10, friSat: 13 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 17, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 34 },
          P: { sunThu: 36, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 47 },
          P: { sunThu: 47, friSat: 58 }
        },
        GRANDVILLA: {
          P: { sunThu: 103, friSat: 120 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 12, friSat: 14 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 16, friSat: 18 },
          P: { sunThu: 19, friSat: 24 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 39 },
          P: { sunThu: 41, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 49 },
          P: { sunThu: 52, friSat: 61 }
        },
        GRANDVILLA: {
          P: { sunThu: 108, friSat: 127 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 13, friSat: 15 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 17, friSat: 19 },
          P: { sunThu: 20, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 42 },
          P: { sunThu: 44, friSat: 54 }
        },
        TWOBR: {
          S: { sunThu: 47, friSat: 53 },
          P: { sunThu: 55, friSat: 67 }
        },
        GRANDVILLA: {
          P: { sunThu: 116, friSat: 135 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 14, friSat: 17 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 48 },
          P: { sunThu: 48, friSat: 58 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 59 },
          P: { sunThu: 59, friSat: 70 }
        },
        GRANDVILLA: {
          P: { sunThu: 120, friSat: 141 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 19, friSat: 22 },
          P: { sunThu: 24, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 39, friSat: 50 },
          P: { sunThu: 49, friSat: 59 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 63 },
          P: { sunThu: 65, friSat: 74 }
        },
        GRANDVILLA: {
          P: { sunThu: 129, friSat: 154 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 17, friSat: 20 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 21, friSat: 25 },
          P: { sunThu: 27, friSat: 30 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 53 },
          P: { sunThu: 53, friSat: 63 }
        },
        TWOBR: {
          S: { sunThu: 56, friSat: 65 },
          P: { sunThu: 71, friSat: 79 }
        },
        GRANDVILLA: {
          P: { sunThu: 140, friSat: 166 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 24, friSat: 27 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 29, friSat: 32 },
          P: { sunThu: 35, friSat: 40 }
        },
        ONEBR: {
          S: { sunThu: 58, friSat: 68 },
          P: { sunThu: 68, friSat: 81 }
        },
        TWOBR: {
          S: { sunThu: 77, friSat: 90 },
          P: { sunThu: 88, friSat: 103 }
        },
        GRANDVILLA: {
          P: { sunThu: 172, friSat: 204 }
        }
      }
    }
  ]
};

// src/data/2025/SSR.json
var SSR_default = {
  resortCode: "SSR",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 14 },
          P: { sunThu: 11, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 21, friSat: 27 },
          P: { sunThu: 24, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 27, friSat: 34 },
          P: { sunThu: 35, friSat: 39 }
        },
        GRANDVILLA: {
          S: { sunThu: 63, friSat: 72 },
          P: { sunThu: 74, friSat: 84 }
        },
        TREEHOUSE: {
          S: { sunThu: 38, friSat: 43 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 12, friSat: 15 },
          P: { sunThu: 13, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 29 },
          P: { sunThu: 28, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 32, friSat: 36 },
          P: { sunThu: 38, friSat: 42 }
        },
        GRANDVILLA: {
          S: { sunThu: 68, friSat: 78 },
          P: { sunThu: 76, friSat: 89 }
        },
        TREEHOUSE: {
          S: { sunThu: 41, friSat: 45 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 15 },
          P: { sunThu: 15, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 31 },
          P: { sunThu: 30, friSat: 35 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 39 },
          P: { sunThu: 39, friSat: 45 }
        },
        GRANDVILLA: {
          S: { sunThu: 74, friSat: 83 },
          P: { sunThu: 82, friSat: 94 }
        },
        TREEHOUSE: {
          S: { sunThu: 43, friSat: 48 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 16 },
          P: { sunThu: 15, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 33 },
          P: { sunThu: 32, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 39 },
          P: { sunThu: 41, friSat: 50 }
        },
        GRANDVILLA: {
          S: { sunThu: 77, friSat: 86 },
          P: { sunThu: 87, friSat: 98 }
        },
        TREEHOUSE: {
          S: { sunThu: 44, friSat: 51 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 16, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 },
          P: { sunThu: 34, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 37, friSat: 45 },
          P: { sunThu: 46, friSat: 54 }
        },
        GRANDVILLA: {
          S: { sunThu: 86, friSat: 97 },
          P: { sunThu: 98, friSat: 112 }
        },
        TREEHOUSE: {
          S: { sunThu: 47, friSat: 52 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 18 },
          P: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 32, friSat: 36 },
          P: { sunThu: 38, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 },
          P: { sunThu: 49, friSat: 59 }
        },
        GRANDVILLA: {
          S: { sunThu: 93, friSat: 107 },
          P: { sunThu: 108, friSat: 125 }
        },
        TREEHOUSE: {
          S: { sunThu: 51, friSat: 58 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 21, friSat: 25 },
          P: { sunThu: 23, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 47 },
          P: { sunThu: 49, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 56, friSat: 63 },
          P: { sunThu: 67, friSat: 75 }
        },
        GRANDVILLA: {
          S: { sunThu: 113, friSat: 127 },
          P: { sunThu: 131, friSat: 139 }
        },
        TREEHOUSE: {
          S: { sunThu: 66, friSat: 76 }
        }
      }
    }
  ]
};

// src/data/2025/VB.json
var VB_default = {
  resortCode: "VB",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-11-25" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 10, friSat: 16 },
          O: { sunThu: 14, friSat: 17 }
        },
        STUDIO: {
          S: { sunThu: 12, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 21, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 30, friSat: 39 }
        },
        COTTAGE: {
          S: { sunThu: 60, friSat: 72 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-05-01", end: "2025-05-31" },
        { start: "2025-11-29", end: "2025-12-23" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 10, friSat: 17 },
          O: { sunThu: 15, friSat: 19 }
        },
        STUDIO: {
          S: { sunThu: 13, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 42 }
        },
        COTTAGE: {
          S: { sunThu: 61, friSat: 74 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-06-01", end: "2025-08-31" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 14, friSat: 17 },
          O: { sunThu: 18, friSat: 21 }
        },
        STUDIO: {
          S: { sunThu: 16, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 47 }
        },
        COTTAGE: {
          S: { sunThu: 73, friSat: 88 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-03-08" },
        { start: "2025-04-27", end: "2025-04-30" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 15, friSat: 20 },
          O: { sunThu: 19, friSat: 23 }
        },
        STUDIO: {
          S: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 52 }
        },
        COTTAGE: {
          S: { sunThu: 81, friSat: 99 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-03-09", end: "2025-04-26" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 21, friSat: 27 },
          O: { sunThu: 26, friSat: 31 }
        },
        STUDIO: {
          S: { sunThu: 23, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 61, friSat: 72 }
        },
        COTTAGE: {
          S: { sunThu: 105, friSat: 126 }
        }
      }
    }
  ]
};

// src/data/2025/VDH.json
var VDH_default = {
  resortCode: "VDH",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-01-06", end: "2025-02-12" },
        { start: "2025-04-22", end: "2025-05-21" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 14, friSat: 23 },
          P: { sunThu: 17, friSat: 28 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 19, friSat: 30 },
          P: { sunThu: 23, friSat: 37 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 18, friSat: 29 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 24, friSat: 38 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 50 },
          P: { sunThu: 38, friSat: 60 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 68 },
          P: { sunThu: 52, friSat: 83 }
        },
        GRANDVILLA: {
          S: { sunThu: 96, friSat: 154 },
          P: { sunThu: 117, friSat: 187 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-02-13", end: "2025-04-09" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 17, friSat: 28 },
          P: { sunThu: 21, friSat: 34 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 23, friSat: 37 },
          P: { sunThu: 28, friSat: 45 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 22, friSat: 35 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 29, friSat: 47 }
        },
        ONEBR: {
          S: { sunThu: 38, friSat: 60 },
          P: { sunThu: 46, friSat: 73 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 83 },
          P: { sunThu: 63, friSat: 101 }
        },
        GRANDVILLA: {
          S: { sunThu: 117, friSat: 187 },
          P: { sunThu: 142, friSat: 227 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-22", end: "2025-08-13" },
        { start: "2025-08-18", end: "2025-09-03" },
        { start: "2025-11-30", end: "2025-12-18" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 21, friSat: 34 },
          P: { sunThu: 26, friSat: 42 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 28, friSat: 45 },
          P: { sunThu: 34, friSat: 54 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 27, friSat: 43 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 35, friSat: 56 }
        },
        ONEBR: {
          S: { sunThu: 46, friSat: 73 },
          P: { sunThu: 56, friSat: 90 }
        },
        TWOBR: {
          S: { sunThu: 63, friSat: 101 },
          P: { sunThu: 76, friSat: 122 }
        },
        GRANDVILLA: {
          S: { sunThu: 142, friSat: 227 },
          P: { sunThu: 172, friSat: 275 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-04-10", end: "2025-04-21" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 26, friSat: 42 },
          P: { sunThu: 32, friSat: 51 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 34, friSat: 54 },
          P: { sunThu: 41, friSat: 66 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 33, friSat: 53 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 43, friSat: 69 }
        },
        ONEBR: {
          S: { sunThu: 56, friSat: 90 },
          P: { sunThu: 68, friSat: 109 }
        },
        TWOBR: {
          S: { sunThu: 76, friSat: 122 },
          P: { sunThu: 92, friSat: 147 }
        },
        GRANDVILLA: {
          S: { sunThu: 172, friSat: 275 },
          P: { sunThu: 209, friSat: 334 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-08-14", end: "2025-08-17" },
        { start: "2025-09-04", end: "2025-11-25" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 30, friSat: 48 },
          P: { sunThu: 36, friSat: 58 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 39, friSat: 62 },
          P: { sunThu: 47, friSat: 75 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 38, friSat: 61 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 49, friSat: 78 }
        },
        ONEBR: {
          S: { sunThu: 64, friSat: 102 },
          P: { sunThu: 77, friSat: 123 }
        },
        TWOBR: {
          S: { sunThu: 87, friSat: 139 },
          P: { sunThu: 105, friSat: 168 }
        },
        GRANDVILLA: {
          S: { sunThu: 196, friSat: 314 },
          P: { sunThu: 238, friSat: 381 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-11-26", end: "2025-11-29" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 36, friSat: 58 },
          P: { sunThu: 44, friSat: 70 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 47, friSat: 75 },
          P: { sunThu: 57, friSat: 91 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 46, friSat: 74 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 60, friSat: 96 }
        },
        ONEBR: {
          S: { sunThu: 77, friSat: 123 },
          P: { sunThu: 93, friSat: 149 }
        },
        TWOBR: {
          S: { sunThu: 105, friSat: 168 },
          P: { sunThu: 127, friSat: 203 }
        },
        GRANDVILLA: {
          S: { sunThu: 238, friSat: 381 },
          P: { sunThu: 289, friSat: 462 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-12-19", end: "2025-12-31" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 44, friSat: 70 },
          P: { sunThu: 53, friSat: 85 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 57, friSat: 91 },
          P: { sunThu: 69, friSat: 110 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 56, friSat: 90 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 72, friSat: 115 }
        },
        ONEBR: {
          S: { sunThu: 93, friSat: 149 },
          P: { sunThu: 113, friSat: 181 }
        },
        TWOBR: {
          S: { sunThu: 127, friSat: 203 },
          P: { sunThu: 154, friSat: 246 }
        },
        GRANDVILLA: {
          S: { sunThu: 289, friSat: 462 },
          P: { sunThu: 351, friSat: 562 }
        }
      }
    }
  ]
};

// src/data/2025/VGC.json
var VGC_default = {
  resortCode: "VGC",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-01-05", end: "2025-02-22" },
        { start: "2025-08-31", end: "2025-10-02" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 94, friSat: 119 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-04-27", end: "2025-06-29" },
        { start: "2025-10-03", end: "2025-11-24" },
        { start: "2025-11-30", end: "2025-12-18" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 20, friSat: 24 }
        },
        ONEBR: {
          S: { sunThu: 39, friSat: 48 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 65 }
        },
        GRANDVILLA: {
          S: { sunThu: 106, friSat: 133 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-02-23", end: "2025-04-10" },
        { start: "2025-06-30", end: "2025-08-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 32 }
        },
        ONEBR: {
          S: { sunThu: 52, friSat: 64 }
        },
        TWOBR: {
          S: { sunThu: 70, friSat: 88 }
        },
        GRANDVILLA: {
          S: { sunThu: 152, friSat: 188 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-01-01", end: "2025-01-04" },
        { start: "2025-04-11", end: "2025-04-26" },
        { start: "2025-11-25", end: "2025-11-29" },
        { start: "2025-12-19", end: "2025-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 30, friSat: 37 }
        },
        ONEBR: {
          S: { sunThu: 62, friSat: 76 }
        },
        TWOBR: {
          S: { sunThu: 86, friSat: 108 }
        },
        GRANDVILLA: {
          S: { sunThu: 182, friSat: 224 }
        }
      }
    }
  ]
};

// src/data/2025/VGF.json
var VGF_default = {
  resortCode: "VGF",
  year: 2025,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2025-09-01", end: "2025-09-30" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 16, friSat: 20 },
          P: { sunThu: 19, friSat: 24 },
          TP: { sunThu: 24, friSat: 27 }
        },
        STUDIO: {
          R: { sunThu: 16, friSat: 20 },
          P: { sunThu: 19, friSat: 24 }
        },
        ONEBR: {
          R: { sunThu: 31, friSat: 41 },
          P: { sunThu: 39, friSat: 48 }
        },
        TWOBR: {
          R: { sunThu: 44, friSat: 55 },
          P: { sunThu: 54, friSat: 65 }
        },
        GRANDVILLA: {
          P: { sunThu: 111, friSat: 131 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2025-01-01", end: "2025-01-31" },
        { start: "2025-05-01", end: "2025-05-14" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 24 },
          TP: { sunThu: 25, friSat: 29 }
        },
        STUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 24 }
        },
        ONEBR: {
          R: { sunThu: 36, friSat: 44 },
          P: { sunThu: 43, friSat: 51 }
        },
        TWOBR: {
          R: { sunThu: 49, friSat: 58 },
          P: { sunThu: 59, friSat: 68 }
        },
        GRANDVILLA: {
          P: { sunThu: 118, friSat: 138 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2025-05-15", end: "2025-06-10" },
        { start: "2025-12-01", end: "2025-12-23" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 21, friSat: 26 },
          TP: { sunThu: 26, friSat: 31 }
        },
        STUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 21, friSat: 26 }
        },
        ONEBR: {
          R: { sunThu: 38, friSat: 46 },
          P: { sunThu: 46, friSat: 55 }
        },
        TWOBR: {
          R: { sunThu: 53, friSat: 61 },
          P: { sunThu: 62, friSat: 74 }
        },
        GRANDVILLA: {
          P: { sunThu: 126, friSat: 148 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2025-02-01", end: "2025-02-15" },
        { start: "2025-06-11", end: "2025-08-31" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 22, friSat: 27 },
          TP: { sunThu: 28, friSat: 32 }
        },
        STUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 22, friSat: 27 }
        },
        ONEBR: {
          R: { sunThu: 41, friSat: 48 },
          P: { sunThu: 49, friSat: 57 }
        },
        TWOBR: {
          R: { sunThu: 56, friSat: 65 },
          P: { sunThu: 66, friSat: 78 }
        },
        GRANDVILLA: {
          P: { sunThu: 131, friSat: 165 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2025-10-01", end: "2025-11-25" },
        { start: "2025-11-29", end: "2025-11-30" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 22, friSat: 24 },
          P: { sunThu: 26, friSat: 29 },
          TP: { sunThu: 32, friSat: 36 }
        },
        STUDIO: {
          R: { sunThu: 22, friSat: 24 },
          P: { sunThu: 26, friSat: 29 }
        },
        ONEBR: {
          R: { sunThu: 43, friSat: 51 },
          P: { sunThu: 53, friSat: 61 }
        },
        TWOBR: {
          R: { sunThu: 61, friSat: 69 },
          P: { sunThu: 73, friSat: 82 }
        },
        GRANDVILLA: {
          P: { sunThu: 143, friSat: 169 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2025-02-16", end: "2025-04-12" },
        { start: "2025-04-21", end: "2025-04-30" },
        { start: "2025-11-26", end: "2025-11-28" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 24, friSat: 26 },
          P: { sunThu: 27, friSat: 32 },
          TP: { sunThu: 34, friSat: 41 }
        },
        STUDIO: {
          R: { sunThu: 24, friSat: 26 },
          P: { sunThu: 27, friSat: 32 }
        },
        ONEBR: {
          R: { sunThu: 46, friSat: 55 },
          P: { sunThu: 55, friSat: 66 }
        },
        TWOBR: {
          R: { sunThu: 65, friSat: 75 },
          P: { sunThu: 75, friSat: 88 }
        },
        GRANDVILLA: {
          P: { sunThu: 161, friSat: 187 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2025-04-13", end: "2025-04-20" },
        { start: "2025-12-24", end: "2025-12-31" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 32, friSat: 37 },
          P: { sunThu: 38, friSat: 44 },
          TP: { sunThu: 47, friSat: 54 }
        },
        STUDIO: {
          R: { sunThu: 32, friSat: 37 },
          P: { sunThu: 38, friSat: 44 }
        },
        ONEBR: {
          R: { sunThu: 64, friSat: 75 },
          P: { sunThu: 76, friSat: 89 }
        },
        TWOBR: {
          R: { sunThu: 87, friSat: 103 },
          P: { sunThu: 103, friSat: 122 }
        },
        GRANDVILLA: {
          P: { sunThu: 197, friSat: 227 }
        }
      }
    }
  ]
};

// src/data/2026/AKV.json
var AKV_default2 = {
  resortCode: "AKV",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 7, friSat: 10 },
          R: { sunThu: 10, friSat: 13 },
          SV: { sunThu: 13, friSat: 16 },
          C: { sunThu: 18, friSat: 22 }
        },
        ONEBR: {
          V: { sunThu: 17, friSat: 20 },
          R: { sunThu: 20, friSat: 25 },
          SV: { sunThu: 27, friSat: 31 },
          C: { sunThu: 38, friSat: 43 }
        },
        TWOBR: {
          V: { sunThu: 22, friSat: 28 },
          R: { sunThu: 28, friSat: 34 },
          SV: { sunThu: 35, friSat: 43 },
          C: { sunThu: 51, friSat: 58 }
        },
        GRANDVILLA: {
          R: { sunThu: 68, friSat: 78 },
          SV: { sunThu: 73, friSat: 85 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 8, friSat: 11 },
          R: { sunThu: 12, friSat: 14 },
          SV: { sunThu: 15, friSat: 17 },
          C: { sunThu: 20, friSat: 23 }
        },
        ONEBR: {
          V: { sunThu: 19, friSat: 21 },
          R: { sunThu: 24, friSat: 28 },
          SV: { sunThu: 31, friSat: 34 },
          C: { sunThu: 41, friSat: 46 }
        },
        TWOBR: {
          V: { sunThu: 25, friSat: 31 },
          R: { sunThu: 31, friSat: 37 },
          SV: { sunThu: 39, friSat: 48 },
          C: { sunThu: 55, friSat: 63 }
        },
        GRANDVILLA: {
          R: { sunThu: 73, friSat: 82 },
          SV: { sunThu: 79, friSat: 89 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 8, friSat: 12 },
          R: { sunThu: 13, friSat: 15 },
          SV: { sunThu: 16, friSat: 18 },
          C: { sunThu: 21, friSat: 24 }
        },
        ONEBR: {
          V: { sunThu: 20, friSat: 22 },
          R: { sunThu: 26, friSat: 29 },
          SV: { sunThu: 33, friSat: 35 },
          C: { sunThu: 43, friSat: 49 }
        },
        TWOBR: {
          V: { sunThu: 27, friSat: 32 },
          R: { sunThu: 32, friSat: 39 },
          SV: { sunThu: 42, friSat: 50 },
          C: { sunThu: 58, friSat: 66 }
        },
        GRANDVILLA: {
          R: { sunThu: 78, friSat: 88 },
          SV: { sunThu: 86, friSat: 96 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 9, friSat: 12 },
          R: { sunThu: 14, friSat: 15 },
          SV: { sunThu: 17, friSat: 20 },
          C: { sunThu: 22, friSat: 24 }
        },
        ONEBR: {
          V: { sunThu: 21, friSat: 24 },
          R: { sunThu: 27, friSat: 30 },
          SV: { sunThu: 34, friSat: 36 },
          C: { sunThu: 44, friSat: 50 }
        },
        TWOBR: {
          V: { sunThu: 29, friSat: 34 },
          R: { sunThu: 35, friSat: 40 },
          SV: { sunThu: 43, friSat: 52 },
          C: { sunThu: 60, friSat: 66 }
        },
        GRANDVILLA: {
          R: { sunThu: 81, friSat: 91 },
          SV: { sunThu: 89, friSat: 100 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 10, friSat: 13 },
          R: { sunThu: 15, friSat: 16 },
          SV: { sunThu: 19, friSat: 20 },
          C: { sunThu: 23, friSat: 25 }
        },
        ONEBR: {
          V: { sunThu: 23, friSat: 26 },
          R: { sunThu: 29, friSat: 32 },
          SV: { sunThu: 35, friSat: 39 },
          C: { sunThu: 46, friSat: 53 }
        },
        TWOBR: {
          V: { sunThu: 30, friSat: 35 },
          R: { sunThu: 36, friSat: 44 },
          SV: { sunThu: 47, friSat: 57 },
          C: { sunThu: 61, friSat: 71 }
        },
        GRANDVILLA: {
          R: { sunThu: 88, friSat: 100 },
          SV: { sunThu: 96, friSat: 110 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 12, friSat: 14 },
          R: { sunThu: 16, friSat: 18 },
          SV: { sunThu: 19, friSat: 22 },
          C: { sunThu: 23, friSat: 26 }
        },
        ONEBR: {
          V: { sunThu: 24, friSat: 27 },
          R: { sunThu: 32, friSat: 35 },
          SV: { sunThu: 38, friSat: 41 },
          C: { sunThu: 49, friSat: 56 }
        },
        TWOBR: {
          V: { sunThu: 31, friSat: 36 },
          R: { sunThu: 40, friSat: 48 },
          SV: { sunThu: 52, friSat: 61 },
          C: { sunThu: 66, friSat: 77 }
        },
        GRANDVILLA: {
          R: { sunThu: 97, friSat: 111 },
          SV: { sunThu: 107, friSat: 121 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 16, friSat: 17 },
          R: { sunThu: 21, friSat: 23 },
          SV: { sunThu: 27, friSat: 29 },
          C: { sunThu: 33, friSat: 36 }
        },
        ONEBR: {
          V: { sunThu: 31, friSat: 35 },
          R: { sunThu: 38, friSat: 45 },
          SV: { sunThu: 47, friSat: 52 },
          C: { sunThu: 65, friSat: 73 }
        },
        TWOBR: {
          V: { sunThu: 43, friSat: 48 },
          R: { sunThu: 55, friSat: 60 },
          SV: { sunThu: 70, friSat: 76 },
          C: { sunThu: 88, friSat: 98 }
        },
        GRANDVILLA: {
          R: { sunThu: 117, friSat: 135 },
          SV: { sunThu: 127, friSat: 144 }
        }
      }
    }
  ]
};

// src/data/2026/AUL.json
var AUL_default2 = {
  resortCode: "AUL",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-01-04", end: "2026-02-28" },
        { start: "2026-09-06", end: "2026-10-10" },
        { start: "2026-11-10", end: "2026-11-23" },
        { start: "2026-11-29", end: "2026-12-17" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 17 },
          I: { sunThu: 19, friSat: 19 },
          P: { sunThu: 23, friSat: 23 },
          O: { sunThu: 25, friSat: 25 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 34 },
          I: { sunThu: 35, friSat: 35 },
          P: { sunThu: 44, friSat: 44 },
          O: { sunThu: 46, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 47, friSat: 47 },
          I: { sunThu: 49, friSat: 49 },
          P: { sunThu: 59, friSat: 59 },
          O: { sunThu: 62, friSat: 62 }
        },
        GRANDVILLA: {
          S: { sunThu: 95, friSat: 95 },
          O: { sunThu: 122, friSat: 122 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-04-12", end: "2026-04-28" },
        { start: "2026-05-06", end: "2026-06-28" },
        { start: "2026-10-11", end: "2026-11-09" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 19, friSat: 19 },
          I: { sunThu: 21, friSat: 21 },
          P: { sunThu: 24, friSat: 24 },
          O: { sunThu: 26, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 37 },
          I: { sunThu: 44, friSat: 44 },
          P: { sunThu: 46, friSat: 46 },
          O: { sunThu: 50, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 51, friSat: 51 },
          I: { sunThu: 59, friSat: 59 },
          P: { sunThu: 62, friSat: 62 },
          O: { sunThu: 69, friSat: 69 }
        },
        GRANDVILLA: {
          S: { sunThu: 103, friSat: 103 },
          O: { sunThu: 134, friSat: 134 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-03-01", end: "2026-03-24" },
        { start: "2026-04-29", end: "2026-05-05" },
        { start: "2026-08-10", end: "2026-09-05" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 22, friSat: 22 },
          I: { sunThu: 25, friSat: 25 },
          P: { sunThu: 26, friSat: 26 },
          O: { sunThu: 29, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 44, friSat: 44 },
          I: { sunThu: 46, friSat: 46 },
          P: { sunThu: 50, friSat: 50 },
          O: { sunThu: 58, friSat: 58 }
        },
        TWOBR: {
          S: { sunThu: 60, friSat: 60 },
          I: { sunThu: 62, friSat: 62 },
          P: { sunThu: 70, friSat: 70 },
          O: { sunThu: 79, friSat: 79 }
        },
        GRANDVILLA: {
          S: { sunThu: 121, friSat: 121 },
          O: { sunThu: 157, friSat: 157 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-01-01", end: "2026-01-03" },
        { start: "2026-03-25", end: "2026-04-11" },
        { start: "2026-04-11", end: "2026-04-26" },
        { start: "2026-06-29", end: "2026-08-09" },
        { start: "2026-11-24", end: "2026-11-28" },
        { start: "2026-12-18", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 24, friSat: 24 },
          I: { sunThu: 27, friSat: 27 },
          P: { sunThu: 29, friSat: 29 },
          O: { sunThu: 31, friSat: 31 }
        },
        ONEBR: {
          S: { sunThu: 46, friSat: 46 },
          I: { sunThu: 50, friSat: 50 },
          P: { sunThu: 58, friSat: 58 },
          O: { sunThu: 62, friSat: 62 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 64 },
          I: { sunThu: 71, friSat: 71 },
          P: { sunThu: 79, friSat: 79 },
          O: { sunThu: 84, friSat: 84 }
        },
        GRANDVILLA: {
          S: { sunThu: 140, friSat: 140 },
          O: { sunThu: 184, friSat: 184 }
        }
      }
    }
  ]
};

// src/data/2026/BCV.json
var BCV_default2 = {
  resortCode: "BCV",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 43 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 33 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 46 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 38 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 47 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 52 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-26", end: "2026-11-28" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 48, friSat: 55 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 27, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 51, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 68, friSat: 71 }
        }
      }
    }
  ]
};

// src/data/2026/BLT.json
var BLT_default2 = {
  resortCode: "BLT",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 16 },
          L: { sunThu: 16, friSat: 19 },
          T: { sunThu: 18, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 32 },
          L: { sunThu: 29, friSat: 36 },
          T: { sunThu: 35, friSat: 44 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 42 },
          L: { sunThu: 38, friSat: 47 },
          T: { sunThu: 48, friSat: 59 }
        },
        GRANDVILLA: {
          L: { sunThu: 82, friSat: 98 },
          T: { sunThu: 101, friSat: 120 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 17 },
          L: { sunThu: 18, friSat: 19 },
          T: { sunThu: 20, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 35 },
          L: { sunThu: 33, friSat: 38 },
          T: { sunThu: 39, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 40, friSat: 45 },
          L: { sunThu: 43, friSat: 50 },
          T: { sunThu: 54, friSat: 61 }
        },
        GRANDVILLA: {
          L: { sunThu: 88, friSat: 104 },
          T: { sunThu: 106, friSat: 125 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 },
          L: { sunThu: 19, friSat: 20 },
          T: { sunThu: 21, friSat: 25 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 38 },
          L: { sunThu: 35, friSat: 41 },
          T: { sunThu: 41, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 42, friSat: 48 },
          L: { sunThu: 46, friSat: 54 },
          T: { sunThu: 57, friSat: 66 }
        },
        GRANDVILLA: {
          L: { sunThu: 96, friSat: 112 },
          T: { sunThu: 115, friSat: 135 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 19 },
          L: { sunThu: 19, friSat: 21 },
          T: { sunThu: 23, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 39 },
          L: { sunThu: 36, friSat: 44 },
          T: { sunThu: 45, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 },
          L: { sunThu: 47, friSat: 58 },
          T: { sunThu: 58, friSat: 67 }
        },
        GRANDVILLA: {
          L: { sunThu: 100, friSat: 115 },
          T: { sunThu: 120, friSat: 141 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 21 },
          L: { sunThu: 20, friSat: 23 },
          T: { sunThu: 24, friSat: 27 }
        },
        ONEBR: {
          S: { sunThu: 33, friSat: 41 },
          L: { sunThu: 38, friSat: 47 },
          T: { sunThu: 47, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 45, friSat: 53 },
          L: { sunThu: 50, friSat: 61 },
          T: { sunThu: 60, friSat: 72 }
        },
        GRANDVILLA: {
          L: { sunThu: 108, friSat: 126 },
          T: { sunThu: 131, friSat: 153 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 19, friSat: 22 },
          L: { sunThu: 21, friSat: 24 },
          T: { sunThu: 26, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 44 },
          L: { sunThu: 42, friSat: 48 },
          T: { sunThu: 49, friSat: 59 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 57 },
          L: { sunThu: 54, friSat: 62 },
          T: { sunThu: 65, friSat: 76 }
        },
        GRANDVILLA: {
          L: { sunThu: 120, friSat: 140 },
          T: { sunThu: 143, friSat: 168 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 29 },
          L: { sunThu: 28, friSat: 32 },
          T: { sunThu: 34, friSat: 38 }
        },
        ONEBR: {
          S: { sunThu: 48, friSat: 56 },
          L: { sunThu: 53, friSat: 62 },
          T: { sunThu: 64, friSat: 75 }
        },
        TWOBR: {
          S: { sunThu: 66, friSat: 77 },
          L: { sunThu: 72, friSat: 84 },
          T: { sunThu: 88, friSat: 98 }
        },
        GRANDVILLA: {
          L: { sunThu: 146, friSat: 171 },
          T: { sunThu: 176, friSat: 207 }
        }
      }
    }
  ]
};

// src/data/2026/BRV.json
var BRV_default2 = {
  resortCode: "BRV",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 27, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 41 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 32, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 48 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 20 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 51 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 19, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 49, friSat: 54 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 47, friSat: 55 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 72 }
        }
      }
    }
  ]
};

// src/data/2026/BWV.json
var BWV_default2 = {
  resortCode: "BWV",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 13 },
          P: { sunThu: 14, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 19, friSat: 27 },
          P: { sunThu: 26, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 29, friSat: 35 },
          P: { sunThu: 35, friSat: 40 }
        },
        GRANDVILLA: {
          P: { sunThu: 76, friSat: 88 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 14 },
          P: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 23, friSat: 28 },
          P: { sunThu: 29, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 32, friSat: 38 },
          P: { sunThu: 39, friSat: 45 }
        },
        GRANDVILLA: {
          P: { sunThu: 81, friSat: 91 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 15 },
          P: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 30 },
          P: { sunThu: 32, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 31, friSat: 41 },
          P: { sunThu: 41, friSat: 47 }
        },
        GRANDVILLA: {
          P: { sunThu: 88, friSat: 97 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 12, friSat: 16 },
          P: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 31 },
          P: { sunThu: 35, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 44 },
          P: { sunThu: 43, friSat: 47 }
        },
        GRANDVILLA: {
          P: { sunThu: 91, friSat: 102 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 18, friSat: 20 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 33 },
          P: { sunThu: 35, friSat: 41 }
        },
        TWOBR: {
          S: { sunThu: 39, friSat: 45 },
          P: { sunThu: 45, friSat: 51 }
        },
        GRANDVILLA: {
          P: { sunThu: 101, friSat: 114 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 19 },
          P: { sunThu: 19, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 },
          P: { sunThu: 39, friSat: 43 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 },
          P: { sunThu: 51, friSat: 55 }
        },
        GRANDVILLA: {
          P: { sunThu: 110, friSat: 124 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 22, friSat: 24 },
          P: { sunThu: 28, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 42, friSat: 48 },
          P: { sunThu: 50, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 60, friSat: 67 },
          P: { sunThu: 68, friSat: 77 }
        },
        GRANDVILLA: {
          P: { sunThu: 133, friSat: 145 }
        }
      }
    }
  ]
};

// src/data/2026/CCV.json
var CCV_default2 = {
  resortCode: "CCV",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 40 }
        },
        GRANDVILLA: {
          S: { sunThu: 91, friSat: 107 }
        },
        CABIN: {
          S: { sunThu: 84, friSat: 100 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        },
        GRANDVILLA: {
          S: { sunThu: 101, friSat: 116 }
        },
        CABIN: {
          S: { sunThu: 94, friSat: 109 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 33, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 }
        },
        GRANDVILLA: {
          S: { sunThu: 108, friSat: 124 }
        },
        CABIN: {
          S: { sunThu: 101, friSat: 117 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 38 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 }
        },
        GRANDVILLA: {
          S: { sunThu: 113, friSat: 130 }
        },
        CABIN: {
          S: { sunThu: 107, friSat: 121 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 45, friSat: 52 }
        },
        GRANDVILLA: {
          S: { sunThu: 120, friSat: 137 }
        },
        CABIN: {
          S: { sunThu: 113, friSat: 131 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 43 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 128, friSat: 147 }
        },
        CABIN: {
          S: { sunThu: 124, friSat: 143 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 25, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 48, friSat: 54 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 72 }
        },
        GRANDVILLA: {
          S: { sunThu: 176, friSat: 206 }
        },
        CABIN: {
          S: { sunThu: 171, friSat: 196 }
        }
      }
    }
  ]
};

// src/data/2026/HHI.json
var HHI_default2 = {
  resortCode: "HHI",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-12-01", end: "2026-12-17" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 6, friSat: 12 }
        },
        ONEBR: {
          S: { sunThu: 14, friSat: 19 }
        },
        TWOBR: {
          S: { sunThu: 20, friSat: 23 }
        },
        GRANDVILLA: {
          S: { sunThu: 27, friSat: 39 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-02-01", end: "2026-03-31" },
        { start: "2026-11-01", end: "2026-11-30" },
        { start: "2026-12-18", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 20, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 24, friSat: 36 }
        },
        GRANDVILLA: {
          S: { sunThu: 47, friSat: 60 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-04-01", end: "2026-06-10" },
        { start: "2026-08-28", end: "2026-10-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 27, friSat: 44 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 59, friSat: 95 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-06-11", end: "2026-08-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 27 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 52 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 66 }
        },
        GRANDVILLA: {
          S: { sunThu: 71, friSat: 111 }
        }
      }
    }
  ]
};

// src/data/2026/OKW.json
var OKW_default2 = {
  resortCode: "OKW",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 13 }
        },
        ONEBR: {
          S: { sunThu: 20, friSat: 25 }
        },
        TWOBR: {
          S: { sunThu: 27, friSat: 35 }
        },
        GRANDVILLA: {
          S: { sunThu: 46, friSat: 56 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 14 }
        },
        ONEBR: {
          S: { sunThu: 23, friSat: 26 }
        },
        TWOBR: {
          S: { sunThu: 31, friSat: 35 }
        },
        GRANDVILLA: {
          S: { sunThu: 50, friSat: 59 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 28 }
        },
        TWOBR: {
          S: { sunThu: 34, friSat: 38 }
        },
        GRANDVILLA: {
          S: { sunThu: 53, friSat: 64 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 11, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 41 }
        },
        GRANDVILLA: {
          S: { sunThu: 56, friSat: 69 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 39, friSat: 44 }
        },
        GRANDVILLA: {
          S: { sunThu: 59, friSat: 71 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 42, friSat: 49 }
        },
        GRANDVILLA: {
          S: { sunThu: 66, friSat: 79 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 22, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 40, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 57, friSat: 65 }
        },
        GRANDVILLA: {
          S: { sunThu: 82, friSat: 106 }
        }
      }
    }
  ]
};

// src/data/2026/PVB.json
var PVB_default2 = {
  resortCode: "PVB",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 14, friSat: 17 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 112, friSat: 132 }
        },
        DUOSTUDIO: {
          R: { sunThu: 12, friSat: 16 },
          P: { sunThu: 16, friSat: 19 },
          PM: { sunThu: 19, friSat: 21 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 14, friSat: 19 },
          P: { sunThu: 19, friSat: 24 },
          TP: { sunThu: 24, friSat: 27 }
        },
        ONEBR: {
          R: { sunThu: 28, friSat: 38 },
          P: { sunThu: 38, friSat: 45 },
          TP: { sunThu: 47, friSat: 52 }
        },
        TWOBR: {
          R: { sunThu: 42, friSat: 53 },
          P: { sunThu: 53, friSat: 63 },
          TP: { sunThu: 64, friSat: 75 }
        },
        PENTHOUSE: {
          P: { sunThu: 86, friSat: 104 },
          TP: { sunThu: 108, friSat: 126 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 17, friSat: 20 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 120, friSat: 139 }
        },
        DUOSTUDIO: {
          R: { sunThu: 14, friSat: 18 },
          P: { sunThu: 18, friSat: 20 },
          PM: { sunThu: 21, friSat: 24 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 17, friSat: 22 },
          P: { sunThu: 22, friSat: 26 },
          TP: { sunThu: 27, friSat: 30 }
        },
        ONEBR: {
          R: { sunThu: 34, friSat: 42 },
          P: { sunThu: 42, friSat: 48 },
          TP: { sunThu: 50, friSat: 56 }
        },
        TWOBR: {
          R: { sunThu: 47, friSat: 54 },
          P: { sunThu: 54, friSat: 66 },
          TP: { sunThu: 71, friSat: 82 }
        },
        PENTHOUSE: {
          P: { sunThu: 95, friSat: 110 },
          TP: { sunThu: 117, friSat: 135 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 18, friSat: 22 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 128, friSat: 147 }
        },
        DUOSTUDIO: {
          R: { sunThu: 16, friSat: 18 },
          P: { sunThu: 19, friSat: 21 },
          PM: { sunThu: 22, friSat: 26 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 19, friSat: 22 },
          P: { sunThu: 22, friSat: 26 },
          TP: { sunThu: 27, friSat: 32 }
        },
        ONEBR: {
          R: { sunThu: 38, friSat: 47 },
          P: { sunThu: 47, friSat: 52 },
          TP: { sunThu: 53, friSat: 61 }
        },
        TWOBR: {
          R: { sunThu: 54, friSat: 63 },
          P: { sunThu: 63, friSat: 67 },
          TP: { sunThu: 82, friSat: 97 }
        },
        PENTHOUSE: {
          P: { sunThu: 102, friSat: 119 },
          TP: { sunThu: 122, friSat: 144 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 20, friSat: 23 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 136, friSat: 157 }
        },
        DUOSTUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 19, friSat: 22 },
          PM: { sunThu: 24, friSat: 27 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 20, friSat: 24 },
          P: { sunThu: 24, friSat: 27 },
          TP: { sunThu: 29, friSat: 35 }
        },
        ONEBR: {
          R: { sunThu: 40, friSat: 48 },
          P: { sunThu: 48, friSat: 54 },
          TP: { sunThu: 56, friSat: 63 }
        },
        TWOBR: {
          R: { sunThu: 56, friSat: 65 },
          P: { sunThu: 65, friSat: 79 },
          TP: { sunThu: 88, friSat: 98 }
        },
        PENTHOUSE: {
          P: { sunThu: 108, friSat: 122 },
          TP: { sunThu: 128, friSat: 162 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 22, friSat: 26 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 160, friSat: 172 }
        },
        DUOSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 20, friSat: 24 },
          PM: { sunThu: 26, friSat: 29 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 22, friSat: 25 },
          P: { sunThu: 25, friSat: 30 },
          TP: { sunThu: 31, friSat: 38 }
        },
        ONEBR: {
          R: { sunThu: 44, friSat: 53 },
          P: { sunThu: 53, friSat: 60 },
          TP: { sunThu: 62, friSat: 70 }
        },
        TWOBR: {
          R: { sunThu: 62, friSat: 70 },
          P: { sunThu: 70, friSat: 84 },
          TP: { sunThu: 90, friSat: 101 }
        },
        PENTHOUSE: {
          P: { sunThu: 115, friSat: 132 },
          TP: { sunThu: 140, friSat: 162 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 25, friSat: 28 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 162, friSat: 185 }
        },
        DUOSTUDIO: {
          R: { sunThu: 20, friSat: 23 },
          P: { sunThu: 22, friSat: 26 },
          PM: { sunThu: 28, friSat: 32 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 25, friSat: 28 },
          P: { sunThu: 28, friSat: 32 },
          TP: { sunThu: 34, friSat: 39 }
        },
        ONEBR: {
          R: { sunThu: 48, friSat: 54 },
          P: { sunThu: 54, friSat: 64 },
          TP: { sunThu: 69, friSat: 75 }
        },
        TWOBR: {
          R: { sunThu: 68, friSat: 75 },
          P: { sunThu: 75, friSat: 90 },
          TP: { sunThu: 96, friSat: 119 }
        },
        PENTHOUSE: {
          P: { sunThu: 126, friSat: 144 },
          TP: { sunThu: 153, friSat: 179 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 34, friSat: 38 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 199, friSat: 226 }
        },
        DUOSTUDIO: {
          R: { sunThu: 27, friSat: 32 },
          P: { sunThu: 30, friSat: 36 },
          PM: { sunThu: 39, friSat: 43 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 34, friSat: 41 },
          P: { sunThu: 41, friSat: 43 },
          TP: { sunThu: 48, friSat: 53 }
        },
        ONEBR: {
          R: { sunThu: 68, friSat: 78 },
          P: { sunThu: 78, friSat: 86 },
          TP: { sunThu: 89, friSat: 105 }
        },
        TWOBR: {
          R: { sunThu: 92, friSat: 105 },
          P: { sunThu: 105, friSat: 129 },
          TP: { sunThu: 149, friSat: 175 }
        },
        PENTHOUSE: {
          P: { sunThu: 178, friSat: 198 },
          TP: { sunThu: 197, friSat: 229 }
        }
      }
    }
  ]
};

// src/data/2026/RVA.json
var RVA_default2 = {
  resortCode: "RVA",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 10, friSat: 13 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 17, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 34 },
          P: { sunThu: 36, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 47 },
          P: { sunThu: 47, friSat: 58 }
        },
        GRANDVILLA: {
          P: { sunThu: 103, friSat: 120 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 12, friSat: 14 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 16, friSat: 18 },
          P: { sunThu: 19, friSat: 24 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 39 },
          P: { sunThu: 41, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 49 },
          P: { sunThu: 52, friSat: 61 }
        },
        GRANDVILLA: {
          P: { sunThu: 108, friSat: 127 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 13, friSat: 15 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 17, friSat: 19 },
          P: { sunThu: 20, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 42 },
          P: { sunThu: 44, friSat: 54 }
        },
        TWOBR: {
          S: { sunThu: 47, friSat: 53 },
          P: { sunThu: 55, friSat: 67 }
        },
        GRANDVILLA: {
          P: { sunThu: 116, friSat: 135 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 14, friSat: 17 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 48 },
          P: { sunThu: 48, friSat: 58 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 59 },
          P: { sunThu: 59, friSat: 70 }
        },
        GRANDVILLA: {
          P: { sunThu: 120, friSat: 141 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 19, friSat: 22 },
          P: { sunThu: 24, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 39, friSat: 50 },
          P: { sunThu: 49, friSat: 59 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 63 },
          P: { sunThu: 65, friSat: 74 }
        },
        GRANDVILLA: {
          P: { sunThu: 129, friSat: 154 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 17, friSat: 20 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 21, friSat: 25 },
          P: { sunThu: 27, friSat: 30 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 53 },
          P: { sunThu: 53, friSat: 63 }
        },
        TWOBR: {
          S: { sunThu: 56, friSat: 65 },
          P: { sunThu: 71, friSat: 79 }
        },
        GRANDVILLA: {
          P: { sunThu: 140, friSat: 166 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 24, friSat: 27 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 29, friSat: 32 },
          P: { sunThu: 35, friSat: 40 }
        },
        ONEBR: {
          S: { sunThu: 58, friSat: 68 },
          P: { sunThu: 68, friSat: 81 }
        },
        TWOBR: {
          S: { sunThu: 77, friSat: 90 },
          P: { sunThu: 88, friSat: 103 }
        },
        GRANDVILLA: {
          P: { sunThu: 172, friSat: 204 }
        }
      }
    }
  ]
};

// src/data/2026/SSR.json
var SSR_default2 = {
  resortCode: "SSR",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 14 },
          P: { sunThu: 11, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 21, friSat: 27 },
          P: { sunThu: 24, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 27, friSat: 34 },
          P: { sunThu: 35, friSat: 39 }
        },
        GRANDVILLA: {
          S: { sunThu: 63, friSat: 72 },
          P: { sunThu: 74, friSat: 84 }
        },
        TREEHOUSE: {
          S: { sunThu: 38, friSat: 43 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 12, friSat: 15 },
          P: { sunThu: 13, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 29 },
          P: { sunThu: 28, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 32, friSat: 36 },
          P: { sunThu: 38, friSat: 42 }
        },
        GRANDVILLA: {
          S: { sunThu: 68, friSat: 78 },
          P: { sunThu: 76, friSat: 89 }
        },
        TREEHOUSE: {
          S: { sunThu: 41, friSat: 45 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 15 },
          P: { sunThu: 15, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 31 },
          P: { sunThu: 30, friSat: 35 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 39 },
          P: { sunThu: 39, friSat: 45 }
        },
        GRANDVILLA: {
          S: { sunThu: 74, friSat: 83 },
          P: { sunThu: 82, friSat: 94 }
        },
        TREEHOUSE: {
          S: { sunThu: 43, friSat: 48 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 16 },
          P: { sunThu: 15, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 33 },
          P: { sunThu: 32, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 39 },
          P: { sunThu: 41, friSat: 50 }
        },
        GRANDVILLA: {
          S: { sunThu: 77, friSat: 86 },
          P: { sunThu: 87, friSat: 98 }
        },
        TREEHOUSE: {
          S: { sunThu: 44, friSat: 51 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 16, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 },
          P: { sunThu: 34, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 37, friSat: 45 },
          P: { sunThu: 46, friSat: 54 }
        },
        GRANDVILLA: {
          S: { sunThu: 86, friSat: 97 },
          P: { sunThu: 98, friSat: 112 }
        },
        TREEHOUSE: {
          S: { sunThu: 47, friSat: 52 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 18 },
          P: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 32, friSat: 36 },
          P: { sunThu: 38, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 },
          P: { sunThu: 49, friSat: 59 }
        },
        GRANDVILLA: {
          S: { sunThu: 93, friSat: 107 },
          P: { sunThu: 108, friSat: 125 }
        },
        TREEHOUSE: {
          S: { sunThu: 51, friSat: 58 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 21, friSat: 25 },
          P: { sunThu: 23, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 47 },
          P: { sunThu: 49, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 56, friSat: 63 },
          P: { sunThu: 67, friSat: 75 }
        },
        GRANDVILLA: {
          S: { sunThu: 113, friSat: 127 },
          P: { sunThu: 131, friSat: 139 }
        },
        TREEHOUSE: {
          S: { sunThu: 66, friSat: 76 }
        }
      }
    }
  ]
};

// src/data/2026/VB.json
var VB_default2 = {
  resortCode: "VB",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-11-24" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 10, friSat: 16 },
          O: { sunThu: 14, friSat: 17 }
        },
        STUDIO: {
          S: { sunThu: 12, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 21, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 30, friSat: 39 }
        },
        COTTAGE: {
          S: { sunThu: 60, friSat: 72 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-05-01", end: "2026-05-31" },
        { start: "2026-11-28", end: "2026-12-23" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 10, friSat: 17 },
          O: { sunThu: 15, friSat: 19 }
        },
        STUDIO: {
          S: { sunThu: 13, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 42 }
        },
        COTTAGE: {
          S: { sunThu: 61, friSat: 74 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-06-01", end: "2026-08-31" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 14, friSat: 17 },
          O: { sunThu: 18, friSat: 21 }
        },
        STUDIO: {
          S: { sunThu: 16, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 47 }
        },
        COTTAGE: {
          S: { sunThu: 73, friSat: 88 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-21" },
        { start: "2026-04-12", end: "2026-04-30" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 15, friSat: 20 },
          O: { sunThu: 19, friSat: 23 }
        },
        STUDIO: {
          S: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 52 }
        },
        COTTAGE: {
          S: { sunThu: 81, friSat: 99 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-02-22", end: "2026-04-11" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 21, friSat: 27 },
          O: { sunThu: 26, friSat: 31 }
        },
        STUDIO: {
          S: { sunThu: 23, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 61, friSat: 72 }
        },
        COTTAGE: {
          S: { sunThu: 105, friSat: 126 }
        }
      }
    }
  ]
};

// src/data/2026/VDH.json
var VDH_default2 = {
  resortCode: "VDH",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-01-05", end: "2026-02-11" },
        { start: "2026-04-21", end: "2026-05-20" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 14, friSat: 23 },
          P: { sunThu: 17, friSat: 28 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 19, friSat: 30 },
          P: { sunThu: 23, friSat: 37 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 18, friSat: 29 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 24, friSat: 38 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 50 },
          P: { sunThu: 38, friSat: 60 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 68 },
          P: { sunThu: 52, friSat: 83 }
        },
        GRANDVILLA: {
          S: { sunThu: 96, friSat: 154 },
          P: { sunThu: 117, friSat: 187 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-02-12", end: "2026-04-08" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 17, friSat: 28 },
          P: { sunThu: 21, friSat: 34 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 23, friSat: 37 },
          P: { sunThu: 28, friSat: 45 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 22, friSat: 35 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 29, friSat: 47 }
        },
        ONEBR: {
          S: { sunThu: 38, friSat: 60 },
          P: { sunThu: 46, friSat: 73 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 83 },
          P: { sunThu: 63, friSat: 101 }
        },
        GRANDVILLA: {
          S: { sunThu: 117, friSat: 187 },
          P: { sunThu: 142, friSat: 227 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-21", end: "2026-08-12" },
        { start: "2026-08-17", end: "2026-09-02" },
        { start: "2026-11-29", end: "2026-12-17" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 21, friSat: 34 },
          P: { sunThu: 26, friSat: 42 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 28, friSat: 45 },
          P: { sunThu: 34, friSat: 54 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 27, friSat: 43 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 35, friSat: 56 }
        },
        ONEBR: {
          S: { sunThu: 46, friSat: 73 },
          P: { sunThu: 56, friSat: 90 }
        },
        TWOBR: {
          S: { sunThu: 63, friSat: 101 },
          P: { sunThu: 76, friSat: 122 }
        },
        GRANDVILLA: {
          S: { sunThu: 142, friSat: 227 },
          P: { sunThu: 172, friSat: 275 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-04-09", end: "2026-04-20" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 26, friSat: 42 },
          P: { sunThu: 32, friSat: 51 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 34, friSat: 54 },
          P: { sunThu: 41, friSat: 66 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 33, friSat: 53 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 43, friSat: 69 }
        },
        ONEBR: {
          S: { sunThu: 56, friSat: 90 },
          P: { sunThu: 68, friSat: 109 }
        },
        TWOBR: {
          S: { sunThu: 76, friSat: 122 },
          P: { sunThu: 92, friSat: 147 }
        },
        GRANDVILLA: {
          S: { sunThu: 172, friSat: 275 },
          P: { sunThu: 209, friSat: 334 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-08-13", end: "2026-08-16" },
        { start: "2026-09-03", end: "2026-11-24" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 30, friSat: 48 },
          P: { sunThu: 36, friSat: 58 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 39, friSat: 62 },
          P: { sunThu: 47, friSat: 75 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 38, friSat: 61 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 49, friSat: 78 }
        },
        ONEBR: {
          S: { sunThu: 64, friSat: 102 },
          P: { sunThu: 77, friSat: 123 }
        },
        TWOBR: {
          S: { sunThu: 87, friSat: 139 },
          P: { sunThu: 105, friSat: 168 }
        },
        GRANDVILLA: {
          S: { sunThu: 196, friSat: 314 },
          P: { sunThu: 238, friSat: 381 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-11-25", end: "2026-11-28" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 36, friSat: 58 },
          P: { sunThu: 44, friSat: 70 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 47, friSat: 75 },
          P: { sunThu: 57, friSat: 91 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 46, friSat: 74 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 60, friSat: 96 }
        },
        ONEBR: {
          S: { sunThu: 77, friSat: 123 },
          P: { sunThu: 93, friSat: 149 }
        },
        TWOBR: {
          S: { sunThu: 105, friSat: 168 },
          P: { sunThu: 127, friSat: 203 }
        },
        GRANDVILLA: {
          S: { sunThu: 238, friSat: 381 },
          P: { sunThu: 289, friSat: 462 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-12-18", end: "2026-12-31" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 44, friSat: 70 },
          P: { sunThu: 53, friSat: 85 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 57, friSat: 91 },
          P: { sunThu: 69, friSat: 110 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 56, friSat: 90 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 72, friSat: 115 }
        },
        ONEBR: {
          S: { sunThu: 93, friSat: 149 },
          P: { sunThu: 113, friSat: 181 }
        },
        TWOBR: {
          S: { sunThu: 127, friSat: 203 },
          P: { sunThu: 154, friSat: 246 }
        },
        GRANDVILLA: {
          S: { sunThu: 289, friSat: 462 },
          P: { sunThu: 351, friSat: 562 }
        }
      }
    }
  ]
};

// src/data/2026/VGC.json
var VGC_default2 = {
  resortCode: "VGC",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-01-04", end: "2026-02-21" },
        { start: "2026-09-06", end: "2026-10-01" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 94, friSat: 119 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-04-12", end: "2026-06-28" },
        { start: "2026-10-02", end: "2026-11-23" },
        { start: "2026-11-29", end: "2026-12-17" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 20, friSat: 24 }
        },
        ONEBR: {
          S: { sunThu: 39, friSat: 48 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 65 }
        },
        GRANDVILLA: {
          S: { sunThu: 106, friSat: 133 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-02-22", end: "2026-03-26" },
        { start: "2026-06-29", end: "2026-09-05" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 32 }
        },
        ONEBR: {
          S: { sunThu: 52, friSat: 64 }
        },
        TWOBR: {
          S: { sunThu: 70, friSat: 88 }
        },
        GRANDVILLA: {
          S: { sunThu: 152, friSat: 188 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-01-01", end: "2026-01-03" },
        { start: "2026-03-27", end: "2026-04-11" },
        { start: "2026-11-24", end: "2026-11-28" },
        { start: "2026-12-18", end: "2026-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 30, friSat: 37 }
        },
        ONEBR: {
          S: { sunThu: 62, friSat: 76 }
        },
        TWOBR: {
          S: { sunThu: 86, friSat: 108 }
        },
        GRANDVILLA: {
          S: { sunThu: 182, friSat: 224 }
        }
      }
    }
  ]
};

// src/data/2026/VGF.json
var VGF_default2 = {
  resortCode: "VGF",
  year: 2026,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2026-09-01", end: "2026-09-30" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 16, friSat: 20 },
          P: { sunThu: 19, friSat: 24 },
          TP: { sunThu: 24, friSat: 27 }
        },
        STUDIO: {
          R: { sunThu: 16, friSat: 20 },
          P: { sunThu: 19, friSat: 24 }
        },
        ONEBR: {
          R: { sunThu: 31, friSat: 41 },
          P: { sunThu: 39, friSat: 48 }
        },
        TWOBR: {
          R: { sunThu: 44, friSat: 55 },
          P: { sunThu: 54, friSat: 65 }
        },
        GRANDVILLA: {
          P: { sunThu: 111, friSat: 131 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2026-01-01", end: "2026-01-31" },
        { start: "2026-05-01", end: "2026-05-14" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 24 },
          TP: { sunThu: 25, friSat: 29 }
        },
        STUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 24 }
        },
        ONEBR: {
          R: { sunThu: 36, friSat: 44 },
          P: { sunThu: 43, friSat: 51 }
        },
        TWOBR: {
          R: { sunThu: 49, friSat: 58 },
          P: { sunThu: 59, friSat: 68 }
        },
        GRANDVILLA: {
          P: { sunThu: 118, friSat: 138 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2026-05-15", end: "2026-06-10" },
        { start: "2026-12-01", end: "2026-12-23" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 21, friSat: 26 },
          TP: { sunThu: 26, friSat: 31 }
        },
        STUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 21, friSat: 26 }
        },
        ONEBR: {
          R: { sunThu: 38, friSat: 46 },
          P: { sunThu: 46, friSat: 55 }
        },
        TWOBR: {
          R: { sunThu: 53, friSat: 61 },
          P: { sunThu: 62, friSat: 74 }
        },
        GRANDVILLA: {
          P: { sunThu: 126, friSat: 148 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2026-02-01", end: "2026-02-15" },
        { start: "2026-06-11", end: "2026-08-31" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 22, friSat: 27 },
          TP: { sunThu: 28, friSat: 32 }
        },
        STUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 22, friSat: 27 }
        },
        ONEBR: {
          R: { sunThu: 41, friSat: 48 },
          P: { sunThu: 49, friSat: 57 }
        },
        TWOBR: {
          R: { sunThu: 56, friSat: 65 },
          P: { sunThu: 66, friSat: 78 }
        },
        GRANDVILLA: {
          P: { sunThu: 131, friSat: 165 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2026-10-01", end: "2026-11-24" },
        { start: "2026-11-28", end: "2026-11-30" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 22, friSat: 24 },
          P: { sunThu: 26, friSat: 29 },
          TP: { sunThu: 32, friSat: 36 }
        },
        STUDIO: {
          R: { sunThu: 22, friSat: 24 },
          P: { sunThu: 26, friSat: 29 }
        },
        ONEBR: {
          R: { sunThu: 43, friSat: 51 },
          P: { sunThu: 53, friSat: 61 }
        },
        TWOBR: {
          R: { sunThu: 61, friSat: 69 },
          P: { sunThu: 73, friSat: 82 }
        },
        GRANDVILLA: {
          P: { sunThu: 143, friSat: 169 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2026-02-16", end: "2026-03-28" },
        { start: "2026-04-06", end: "2026-04-30" },
        { start: "2026-11-25", end: "2026-11-27" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 24, friSat: 26 },
          P: { sunThu: 27, friSat: 32 },
          TP: { sunThu: 34, friSat: 41 }
        },
        STUDIO: {
          R: { sunThu: 24, friSat: 26 },
          P: { sunThu: 27, friSat: 32 }
        },
        ONEBR: {
          R: { sunThu: 46, friSat: 55 },
          P: { sunThu: 55, friSat: 66 }
        },
        TWOBR: {
          R: { sunThu: 65, friSat: 75 },
          P: { sunThu: 75, friSat: 88 }
        },
        GRANDVILLA: {
          P: { sunThu: 161, friSat: 187 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2026-03-29", end: "2026-04-05" },
        { start: "2026-12-24", end: "2026-12-31" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 32, friSat: 37 },
          P: { sunThu: 38, friSat: 44 },
          TP: { sunThu: 47, friSat: 54 }
        },
        STUDIO: {
          R: { sunThu: 32, friSat: 37 },
          P: { sunThu: 38, friSat: 44 }
        },
        ONEBR: {
          R: { sunThu: 64, friSat: 75 },
          P: { sunThu: 76, friSat: 89 }
        },
        TWOBR: {
          R: { sunThu: 87, friSat: 103 },
          P: { sunThu: 103, friSat: 122 }
        },
        GRANDVILLA: {
          P: { sunThu: 197, friSat: 227 }
        }
      }
    }
  ]
};

// src/data/2027/AKV.json
var AKV_default3 = {
  resortCode: "AKV",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 8, friSat: 11 },
          R: { sunThu: 10, friSat: 13 },
          SV: { sunThu: 12, friSat: 15 },
          C: { sunThu: 20, friSat: 24 }
        },
        ONEBR: {
          V: { sunThu: 19, friSat: 23 },
          R: { sunThu: 20, friSat: 25 },
          SV: { sunThu: 26, friSat: 30 },
          C: { sunThu: 41, friSat: 46 }
        },
        TWOBR: {
          V: { sunThu: 25, friSat: 32 },
          R: { sunThu: 28, friSat: 34 },
          SV: { sunThu: 35, friSat: 43 },
          C: { sunThu: 55, friSat: 62 }
        },
        GRANDVILLA: {
          R: { sunThu: 68, friSat: 78 },
          SV: { sunThu: 73, friSat: 85 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 9, friSat: 12 },
          R: { sunThu: 12, friSat: 14 },
          SV: { sunThu: 14, friSat: 16 },
          C: { sunThu: 23, friSat: 26 }
        },
        ONEBR: {
          V: { sunThu: 21, friSat: 23 },
          R: { sunThu: 24, friSat: 28 },
          SV: { sunThu: 30, friSat: 33 },
          C: { sunThu: 43, friSat: 48 }
        },
        TWOBR: {
          V: { sunThu: 28, friSat: 34 },
          R: { sunThu: 31, friSat: 37 },
          SV: { sunThu: 39, friSat: 47 },
          C: { sunThu: 59, friSat: 68 }
        },
        GRANDVILLA: {
          R: { sunThu: 73, friSat: 82 },
          SV: { sunThu: 79, friSat: 89 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 9, friSat: 13 },
          R: { sunThu: 13, friSat: 15 },
          SV: { sunThu: 15, friSat: 17 },
          C: { sunThu: 23, friSat: 26 }
        },
        ONEBR: {
          V: { sunThu: 23, friSat: 24 },
          R: { sunThu: 26, friSat: 29 },
          SV: { sunThu: 32, friSat: 35 },
          C: { sunThu: 45, friSat: 51 }
        },
        TWOBR: {
          V: { sunThu: 31, friSat: 35 },
          R: { sunThu: 32, friSat: 39 },
          SV: { sunThu: 42, friSat: 50 },
          C: { sunThu: 63, friSat: 70 }
        },
        GRANDVILLA: {
          R: { sunThu: 78, friSat: 88 },
          SV: { sunThu: 86, friSat: 96 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 10, friSat: 13 },
          R: { sunThu: 14, friSat: 15 },
          SV: { sunThu: 15, friSat: 18 },
          C: { sunThu: 25, friSat: 27 }
        },
        ONEBR: {
          V: { sunThu: 23, friSat: 25 },
          R: { sunThu: 27, friSat: 30 },
          SV: { sunThu: 33, friSat: 35 },
          C: { sunThu: 47, friSat: 51 }
        },
        TWOBR: {
          V: { sunThu: 32, friSat: 36 },
          R: { sunThu: 35, friSat: 40 },
          SV: { sunThu: 43, friSat: 50 },
          C: { sunThu: 65, friSat: 72 }
        },
        GRANDVILLA: {
          R: { sunThu: 81, friSat: 91 },
          SV: { sunThu: 89, friSat: 100 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 11, friSat: 14 },
          R: { sunThu: 15, friSat: 16 },
          SV: { sunThu: 17, friSat: 19 },
          C: { sunThu: 26, friSat: 29 }
        },
        ONEBR: {
          V: { sunThu: 25, friSat: 27 },
          R: { sunThu: 29, friSat: 32 },
          SV: { sunThu: 34, friSat: 39 },
          C: { sunThu: 50, friSat: 57 }
        },
        TWOBR: {
          V: { sunThu: 35, friSat: 40 },
          R: { sunThu: 36, friSat: 44 },
          SV: { sunThu: 47, friSat: 57 },
          C: { sunThu: 68, friSat: 79 }
        },
        GRANDVILLA: {
          R: { sunThu: 88, friSat: 100 },
          SV: { sunThu: 96, friSat: 110 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 13, friSat: 16 },
          R: { sunThu: 16, friSat: 18 },
          SV: { sunThu: 17, friSat: 21 },
          C: { sunThu: 27, friSat: 31 }
        },
        ONEBR: {
          V: { sunThu: 26, friSat: 29 },
          R: { sunThu: 32, friSat: 35 },
          SV: { sunThu: 37, friSat: 41 },
          C: { sunThu: 54, friSat: 61 }
        },
        TWOBR: {
          V: { sunThu: 37, friSat: 43 },
          R: { sunThu: 40, friSat: 48 },
          SV: { sunThu: 52, friSat: 61 },
          C: { sunThu: 74, friSat: 87 }
        },
        GRANDVILLA: {
          R: { sunThu: 97, friSat: 111 },
          SV: { sunThu: 107, friSat: 121 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          V: { sunThu: 17, friSat: 19 },
          R: { sunThu: 21, friSat: 23 },
          SV: { sunThu: 26, friSat: 29 },
          C: { sunThu: 37, friSat: 40 }
        },
        ONEBR: {
          V: { sunThu: 34, friSat: 39 },
          R: { sunThu: 38, friSat: 45 },
          SV: { sunThu: 45, friSat: 51 },
          C: { sunThu: 67, friSat: 74 }
        },
        TWOBR: {
          V: { sunThu: 51, friSat: 56 },
          R: { sunThu: 55, friSat: 60 },
          SV: { sunThu: 70, friSat: 76 },
          C: { sunThu: 99, friSat: 109 }
        },
        GRANDVILLA: {
          R: { sunThu: 117, friSat: 135 },
          SV: { sunThu: 127, friSat: 144 }
        }
      }
    }
  ]
};

// src/data/2027/AUL.json
var AUL_default3 = {
  resortCode: "AUL",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-01-03", end: "2027-02-27" },
        { start: "2027-09-05", end: "2027-10-09" },
        { start: "2027-11-10", end: "2027-11-22" },
        { start: "2027-11-28", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 16 },
          I: { sunThu: 19, friSat: 19 },
          P: { sunThu: 23, friSat: 23 },
          O: { sunThu: 25, friSat: 25 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 34 },
          I: { sunThu: 35, friSat: 35 },
          P: { sunThu: 44, friSat: 44 },
          O: { sunThu: 46, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 47, friSat: 47 },
          I: { sunThu: 49, friSat: 49 },
          P: { sunThu: 59, friSat: 59 },
          O: { sunThu: 62, friSat: 62 }
        },
        GRANDVILLA: {
          S: { sunThu: 95, friSat: 95 },
          O: { sunThu: 122, friSat: 122 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-04-04", end: "2027-04-28" },
        { start: "2027-05-06", end: "2027-06-27" },
        { start: "2027-10-10", end: "2027-11-09" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 17 },
          I: { sunThu: 21, friSat: 21 },
          P: { sunThu: 24, friSat: 24 },
          O: { sunThu: 26, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 37 },
          I: { sunThu: 44, friSat: 44 },
          P: { sunThu: 46, friSat: 46 },
          O: { sunThu: 50, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 51, friSat: 51 },
          I: { sunThu: 59, friSat: 59 },
          P: { sunThu: 62, friSat: 62 },
          O: { sunThu: 69, friSat: 69 }
        },
        GRANDVILLA: {
          S: { sunThu: 103, friSat: 103 },
          O: { sunThu: 134, friSat: 134 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-02-28", end: "2027-03-18" },
        { start: "2027-04-29", end: "2027-05-05" },
        { start: "2027-08-09", end: "2027-09-04" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 18 },
          I: { sunThu: 25, friSat: 25 },
          P: { sunThu: 26, friSat: 26 },
          O: { sunThu: 29, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 44, friSat: 44 },
          I: { sunThu: 46, friSat: 46 },
          P: { sunThu: 50, friSat: 50 },
          O: { sunThu: 58, friSat: 58 }
        },
        TWOBR: {
          S: { sunThu: 60, friSat: 60 },
          I: { sunThu: 62, friSat: 62 },
          P: { sunThu: 70, friSat: 70 },
          O: { sunThu: 79, friSat: 79 }
        },
        GRANDVILLA: {
          S: { sunThu: 121, friSat: 121 },
          O: { sunThu: 157, friSat: 157 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-01-01", end: "2027-01-02" },
        { start: "2027-03-19", end: "2027-04-03" },
        { start: "2027-06-28", end: "2027-08-08" },
        { start: "2027-11-23", end: "2027-11-27" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 21, friSat: 21 },
          I: { sunThu: 27, friSat: 27 },
          P: { sunThu: 29, friSat: 29 },
          O: { sunThu: 31, friSat: 31 }
        },
        ONEBR: {
          S: { sunThu: 46, friSat: 46 },
          I: { sunThu: 50, friSat: 50 },
          P: { sunThu: 58, friSat: 58 },
          O: { sunThu: 62, friSat: 62 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 64 },
          I: { sunThu: 71, friSat: 71 },
          P: { sunThu: 79, friSat: 79 },
          O: { sunThu: 84, friSat: 84 }
        },
        GRANDVILLA: {
          S: { sunThu: 140, friSat: 140 },
          O: { sunThu: 184, friSat: 184 }
        }
      }
    }
  ]
};

// src/data/2027/BCV.json
var BCV_default3 = {
  resortCode: "BCV",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 43 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 33 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 46 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 38 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 47 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 52 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 48, friSat: 55 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 27, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 51, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 68, friSat: 71 }
        }
      }
    }
  ]
};

// src/data/2027/BLT.json
var BLT_default3 = {
  resortCode: "BLT",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 16 },
          L: { sunThu: 16, friSat: 19 },
          T: { sunThu: 18, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 32 },
          L: { sunThu: 29, friSat: 36 },
          T: { sunThu: 35, friSat: 44 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 42 },
          L: { sunThu: 38, friSat: 47 },
          T: { sunThu: 48, friSat: 59 }
        },
        GRANDVILLA: {
          L: { sunThu: 82, friSat: 98 },
          T: { sunThu: 101, friSat: 120 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 17 },
          L: { sunThu: 18, friSat: 19 },
          T: { sunThu: 20, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 35 },
          L: { sunThu: 33, friSat: 38 },
          T: { sunThu: 39, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 40, friSat: 45 },
          L: { sunThu: 43, friSat: 50 },
          T: { sunThu: 54, friSat: 61 }
        },
        GRANDVILLA: {
          L: { sunThu: 88, friSat: 104 },
          T: { sunThu: 106, friSat: 125 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 },
          L: { sunThu: 19, friSat: 20 },
          T: { sunThu: 21, friSat: 25 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 38 },
          L: { sunThu: 35, friSat: 41 },
          T: { sunThu: 41, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 42, friSat: 48 },
          L: { sunThu: 46, friSat: 54 },
          T: { sunThu: 57, friSat: 66 }
        },
        GRANDVILLA: {
          L: { sunThu: 96, friSat: 112 },
          T: { sunThu: 115, friSat: 135 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 19 },
          L: { sunThu: 19, friSat: 21 },
          T: { sunThu: 23, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 39 },
          L: { sunThu: 36, friSat: 44 },
          T: { sunThu: 45, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 },
          L: { sunThu: 47, friSat: 58 },
          T: { sunThu: 58, friSat: 67 }
        },
        GRANDVILLA: {
          L: { sunThu: 100, friSat: 115 },
          T: { sunThu: 120, friSat: 141 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 21 },
          L: { sunThu: 20, friSat: 23 },
          T: { sunThu: 24, friSat: 27 }
        },
        ONEBR: {
          S: { sunThu: 33, friSat: 41 },
          L: { sunThu: 38, friSat: 47 },
          T: { sunThu: 47, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 45, friSat: 53 },
          L: { sunThu: 50, friSat: 61 },
          T: { sunThu: 60, friSat: 72 }
        },
        GRANDVILLA: {
          L: { sunThu: 108, friSat: 126 },
          T: { sunThu: 131, friSat: 153 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 19, friSat: 22 },
          L: { sunThu: 21, friSat: 24 },
          T: { sunThu: 26, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 44 },
          L: { sunThu: 42, friSat: 48 },
          T: { sunThu: 49, friSat: 59 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 57 },
          L: { sunThu: 54, friSat: 62 },
          T: { sunThu: 65, friSat: 76 }
        },
        GRANDVILLA: {
          L: { sunThu: 120, friSat: 140 },
          T: { sunThu: 143, friSat: 168 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 29 },
          L: { sunThu: 28, friSat: 32 },
          T: { sunThu: 34, friSat: 38 }
        },
        ONEBR: {
          S: { sunThu: 48, friSat: 56 },
          L: { sunThu: 53, friSat: 62 },
          T: { sunThu: 64, friSat: 75 }
        },
        TWOBR: {
          S: { sunThu: 66, friSat: 77 },
          L: { sunThu: 72, friSat: 84 },
          T: { sunThu: 88, friSat: 98 }
        },
        GRANDVILLA: {
          L: { sunThu: 146, friSat: 171 },
          T: { sunThu: 176, friSat: 207 }
        }
      }
    }
  ]
};

// src/data/2027/BRV.json
var BRV_default3 = {
  resortCode: "BRV",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 27, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 41 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 32, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 48 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 20 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 51 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 19, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 49, friSat: 54 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 47, friSat: 55 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 72 }
        }
      }
    }
  ]
};

// src/data/2027/BWV.json
var BWV_default3 = {
  resortCode: "BWV",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 13 },
          P: { sunThu: 14, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 19, friSat: 27 },
          P: { sunThu: 26, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 29, friSat: 35 },
          P: { sunThu: 35, friSat: 40 }
        },
        GRANDVILLA: {
          P: { sunThu: 76, friSat: 88 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 14 },
          P: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 23, friSat: 28 },
          P: { sunThu: 29, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 32, friSat: 38 },
          P: { sunThu: 39, friSat: 45 }
        },
        GRANDVILLA: {
          P: { sunThu: 81, friSat: 91 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 11, friSat: 15 },
          P: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 30 },
          P: { sunThu: 32, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 31, friSat: 41 },
          P: { sunThu: 41, friSat: 47 }
        },
        GRANDVILLA: {
          P: { sunThu: 88, friSat: 97 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 11, friSat: 16 },
          P: { sunThu: 16, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 31 },
          P: { sunThu: 35, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 44 },
          P: { sunThu: 43, friSat: 47 }
        },
        GRANDVILLA: {
          P: { sunThu: 91, friSat: 102 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 18, friSat: 20 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 33 },
          P: { sunThu: 35, friSat: 41 }
        },
        TWOBR: {
          S: { sunThu: 39, friSat: 45 },
          P: { sunThu: 45, friSat: 51 }
        },
        GRANDVILLA: {
          P: { sunThu: 101, friSat: 114 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 19 },
          P: { sunThu: 19, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 },
          P: { sunThu: 39, friSat: 43 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 },
          P: { sunThu: 51, friSat: 55 }
        },
        GRANDVILLA: {
          P: { sunThu: 110, friSat: 124 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 22, friSat: 24 },
          P: { sunThu: 28, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 42, friSat: 48 },
          P: { sunThu: 50, friSat: 56 }
        },
        TWOBR: {
          S: { sunThu: 60, friSat: 67 },
          P: { sunThu: 68, friSat: 77 }
        },
        GRANDVILLA: {
          P: { sunThu: 133, friSat: 145 }
        }
      }
    }
  ]
};

// src/data/2027/CCV.json
var CCV_default3 = {
  resortCode: "CCV",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 40 }
        },
        GRANDVILLA: {
          S: { sunThu: 91, friSat: 107 }
        },
        CABIN: {
          S: { sunThu: 84, friSat: 100 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 44 }
        },
        GRANDVILLA: {
          S: { sunThu: 101, friSat: 116 }
        },
        CABIN: {
          S: { sunThu: 94, friSat: 109 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 16, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 33, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 }
        },
        GRANDVILLA: {
          S: { sunThu: 108, friSat: 124 }
        },
        CABIN: {
          S: { sunThu: 101, friSat: 117 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 38 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 49 }
        },
        GRANDVILLA: {
          S: { sunThu: 113, friSat: 130 }
        },
        CABIN: {
          S: { sunThu: 107, friSat: 121 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 45, friSat: 52 }
        },
        GRANDVILLA: {
          S: { sunThu: 120, friSat: 137 }
        },
        CABIN: {
          S: { sunThu: 113, friSat: 131 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 18, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 37, friSat: 43 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 128, friSat: 147 }
        },
        CABIN: {
          S: { sunThu: 124, friSat: 143 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 25, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 48, friSat: 54 }
        },
        TWOBR: {
          S: { sunThu: 64, friSat: 72 }
        },
        GRANDVILLA: {
          S: { sunThu: 176, friSat: 206 }
        },
        CABIN: {
          S: { sunThu: 171, friSat: 196 }
        }
      }
    }
  ]
};

// src/data/2027/CFW.json
var CFW_default = {
  resortCode: "CFW",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        CABIN: {
          S: { sunThu: 15, friSat: 18 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        CABIN: {
          S: { sunThu: 16, friSat: 19 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        CABIN: {
          S: { sunThu: 18, friSat: 21 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        CABIN: {
          S: { sunThu: 20, friSat: 24 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        CABIN: {
          S: { sunThu: 22, friSat: 25 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        CABIN: {
          S: { sunThu: 24, friSat: 28 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        CABIN: {
          S: { sunThu: 32, friSat: 36 }
        }
      }
    }
  ]
};

// src/data/2027/HHI.json
var HHI_default3 = {
  resortCode: "HHI",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-12-01", end: "2027-12-17" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 6, friSat: 12 }
        },
        ONEBR: {
          S: { sunThu: 14, friSat: 19 }
        },
        TWOBR: {
          S: { sunThu: 20, friSat: 23 }
        },
        GRANDVILLA: {
          S: { sunThu: 27, friSat: 39 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-02-01", end: "2027-03-31" },
        { start: "2027-11-01", end: "2027-11-30" },
        { start: "2027-12-18", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 20, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 24, friSat: 36 }
        },
        GRANDVILLA: {
          S: { sunThu: 47, friSat: 60 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-04-01", end: "2027-06-10" },
        { start: "2027-08-28", end: "2027-10-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 23 }
        },
        ONEBR: {
          S: { sunThu: 27, friSat: 44 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 59, friSat: 95 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-06-11", end: "2027-08-27" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 27 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 52 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 66 }
        },
        GRANDVILLA: {
          S: { sunThu: 71, friSat: 111 }
        }
      }
    }
  ]
};

// src/data/2027/OKW.json
var OKW_default3 = {
  resortCode: "OKW",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 13 }
        },
        ONEBR: {
          S: { sunThu: 20, friSat: 25 }
        },
        TWOBR: {
          S: { sunThu: 27, friSat: 35 }
        },
        GRANDVILLA: {
          S: { sunThu: 46, friSat: 56 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 14 }
        },
        ONEBR: {
          S: { sunThu: 23, friSat: 26 }
        },
        TWOBR: {
          S: { sunThu: 31, friSat: 35 }
        },
        GRANDVILLA: {
          S: { sunThu: 50, friSat: 59 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 10, friSat: 15 }
        },
        ONEBR: {
          S: { sunThu: 25, friSat: 28 }
        },
        TWOBR: {
          S: { sunThu: 34, friSat: 38 }
        },
        GRANDVILLA: {
          S: { sunThu: 53, friSat: 64 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 11, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 41 }
        },
        GRANDVILLA: {
          S: { sunThu: 56, friSat: 69 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 39, friSat: 44 }
        },
        GRANDVILLA: {
          S: { sunThu: 59, friSat: 71 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 36 }
        },
        TWOBR: {
          S: { sunThu: 42, friSat: 49 }
        },
        GRANDVILLA: {
          S: { sunThu: 66, friSat: 79 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 22, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 40, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 57, friSat: 65 }
        },
        GRANDVILLA: {
          S: { sunThu: 82, friSat: 106 }
        }
      }
    }
  ]
};

// src/data/2027/PVB.json
var PVB_default3 = {
  resortCode: "PVB",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 14, friSat: 17 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 112, friSat: 132 }
        },
        DUOSTUDIO: {
          R: { sunThu: 12, friSat: 16 },
          P: { sunThu: 16, friSat: 19 },
          PM: { sunThu: 19, friSat: 21 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 14, friSat: 19 },
          P: { sunThu: 19, friSat: 24 },
          TP: { sunThu: 24, friSat: 27 }
        },
        ONEBR: {
          R: { sunThu: 28, friSat: 38 },
          P: { sunThu: 38, friSat: 45 },
          TP: { sunThu: 47, friSat: 52 }
        },
        TWOBR: {
          R: { sunThu: 42, friSat: 53 },
          P: { sunThu: 53, friSat: 63 },
          TP: { sunThu: 64, friSat: 75 }
        },
        PENTHOUSE: {
          P: { sunThu: 86, friSat: 104 },
          TP: { sunThu: 108, friSat: 126 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 17, friSat: 20 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 120, friSat: 139 }
        },
        DUOSTUDIO: {
          R: { sunThu: 14, friSat: 16 },
          P: { sunThu: 18, friSat: 20 },
          PM: { sunThu: 21, friSat: 24 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 17, friSat: 22 },
          P: { sunThu: 22, friSat: 26 },
          TP: { sunThu: 27, friSat: 30 }
        },
        ONEBR: {
          R: { sunThu: 34, friSat: 42 },
          P: { sunThu: 42, friSat: 48 },
          TP: { sunThu: 50, friSat: 56 }
        },
        TWOBR: {
          R: { sunThu: 47, friSat: 54 },
          P: { sunThu: 54, friSat: 66 },
          TP: { sunThu: 71, friSat: 82 }
        },
        PENTHOUSE: {
          P: { sunThu: 95, friSat: 110 },
          TP: { sunThu: 117, friSat: 135 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 18, friSat: 22 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 128, friSat: 147 }
        },
        DUOSTUDIO: {
          R: { sunThu: 16, friSat: 19 },
          P: { sunThu: 19, friSat: 21 },
          PM: { sunThu: 22, friSat: 26 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 19, friSat: 22 },
          P: { sunThu: 22, friSat: 26 },
          TP: { sunThu: 27, friSat: 32 }
        },
        ONEBR: {
          R: { sunThu: 38, friSat: 47 },
          P: { sunThu: 47, friSat: 52 },
          TP: { sunThu: 53, friSat: 61 }
        },
        TWOBR: {
          R: { sunThu: 54, friSat: 63 },
          P: { sunThu: 63, friSat: 67 },
          TP: { sunThu: 82, friSat: 97 }
        },
        PENTHOUSE: {
          P: { sunThu: 102, friSat: 119 },
          TP: { sunThu: 122, friSat: 144 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 20, friSat: 23 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 136, friSat: 157 }
        },
        DUOSTUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 19, friSat: 22 },
          PM: { sunThu: 24, friSat: 27 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 20, friSat: 24 },
          P: { sunThu: 24, friSat: 27 },
          TP: { sunThu: 29, friSat: 35 }
        },
        ONEBR: {
          R: { sunThu: 40, friSat: 48 },
          P: { sunThu: 48, friSat: 54 },
          TP: { sunThu: 56, friSat: 63 }
        },
        TWOBR: {
          R: { sunThu: 56, friSat: 65 },
          P: { sunThu: 65, friSat: 79 },
          TP: { sunThu: 88, friSat: 98 }
        },
        PENTHOUSE: {
          P: { sunThu: 108, friSat: 122 },
          TP: { sunThu: 128, friSat: 162 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 22, friSat: 26 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 160, friSat: 172 }
        },
        DUOSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 20, friSat: 24 },
          PM: { sunThu: 26, friSat: 29 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 22, friSat: 25 },
          P: { sunThu: 25, friSat: 30 },
          TP: { sunThu: 31, friSat: 38 }
        },
        ONEBR: {
          R: { sunThu: 44, friSat: 53 },
          P: { sunThu: 53, friSat: 60 },
          TP: { sunThu: 62, friSat: 70 }
        },
        TWOBR: {
          R: { sunThu: 62, friSat: 70 },
          P: { sunThu: 70, friSat: 84 },
          TP: { sunThu: 90, friSat: 101 }
        },
        PENTHOUSE: {
          P: { sunThu: 115, friSat: 132 },
          TP: { sunThu: 140, friSat: 162 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 25, friSat: 28 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 162, friSat: 185 }
        },
        DUOSTUDIO: {
          R: { sunThu: 20, friSat: 23 },
          P: { sunThu: 22, friSat: 26 },
          PM: { sunThu: 28, friSat: 32 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 25, friSat: 28 },
          P: { sunThu: 28, friSat: 32 },
          TP: { sunThu: 34, friSat: 39 }
        },
        ONEBR: {
          R: { sunThu: 48, friSat: 54 },
          P: { sunThu: 54, friSat: 64 },
          TP: { sunThu: 69, friSat: 75 }
        },
        TWOBR: {
          R: { sunThu: 68, friSat: 75 },
          P: { sunThu: 75, friSat: 90 },
          TP: { sunThu: 96, friSat: 119 }
        },
        PENTHOUSE: {
          P: { sunThu: 126, friSat: 144 },
          TP: { sunThu: 153, friSat: 179 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          R: { sunThu: 34, friSat: 38 }
        },
        TWOBRBUNGALOW: {
          P: { sunThu: 199, friSat: 226 }
        },
        DUOSTUDIO: {
          R: { sunThu: 27, friSat: 32 },
          P: { sunThu: 30, friSat: 36 },
          PM: { sunThu: 39, friSat: 43 }
        },
        DELUXESTUDIO: {
          R: { sunThu: 34, friSat: 41 },
          P: { sunThu: 41, friSat: 43 },
          TP: { sunThu: 48, friSat: 53 }
        },
        ONEBR: {
          R: { sunThu: 68, friSat: 78 },
          P: { sunThu: 78, friSat: 86 },
          TP: { sunThu: 89, friSat: 105 }
        },
        TWOBR: {
          R: { sunThu: 92, friSat: 105 },
          P: { sunThu: 105, friSat: 129 },
          TP: { sunThu: 149, friSat: 175 }
        },
        PENTHOUSE: {
          P: { sunThu: 178, friSat: 198 },
          TP: { sunThu: 197, friSat: 229 }
        }
      }
    }
  ]
};

// src/data/2027/RVA.json
var RVA_default3 = {
  resortCode: "RVA",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 10, friSat: 13 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 17, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 34 },
          P: { sunThu: 36, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 38, friSat: 47 },
          P: { sunThu: 47, friSat: 58 }
        },
        GRANDVILLA: {
          P: { sunThu: 103, friSat: 120 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 12, friSat: 14 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 16, friSat: 18 },
          P: { sunThu: 19, friSat: 24 }
        },
        ONEBR: {
          S: { sunThu: 34, friSat: 39 },
          P: { sunThu: 41, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 49 },
          P: { sunThu: 52, friSat: 61 }
        },
        GRANDVILLA: {
          P: { sunThu: 108, friSat: 127 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 13, friSat: 15 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 17, friSat: 19 },
          P: { sunThu: 20, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 35, friSat: 42 },
          P: { sunThu: 44, friSat: 54 }
        },
        TWOBR: {
          S: { sunThu: 47, friSat: 53 },
          P: { sunThu: 55, friSat: 67 }
        },
        GRANDVILLA: {
          P: { sunThu: 116, friSat: 135 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 14, friSat: 17 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 48 },
          P: { sunThu: 48, friSat: 58 }
        },
        TWOBR: {
          S: { sunThu: 50, friSat: 59 },
          P: { sunThu: 59, friSat: 70 }
        },
        GRANDVILLA: {
          P: { sunThu: 120, friSat: 141 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 16, friSat: 18 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 19, friSat: 22 },
          P: { sunThu: 24, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 39, friSat: 50 },
          P: { sunThu: 49, friSat: 59 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 63 },
          P: { sunThu: 65, friSat: 74 }
        },
        GRANDVILLA: {
          P: { sunThu: 129, friSat: 154 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 17, friSat: 20 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 21, friSat: 25 },
          P: { sunThu: 27, friSat: 30 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 53 },
          P: { sunThu: 53, friSat: 63 }
        },
        TWOBR: {
          S: { sunThu: 56, friSat: 65 },
          P: { sunThu: 71, friSat: 79 }
        },
        GRANDVILLA: {
          P: { sunThu: 140, friSat: 166 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        TOWERSTUDIO: {
          S: { sunThu: 24, friSat: 27 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 29, friSat: 32 },
          P: { sunThu: 35, friSat: 40 }
        },
        ONEBR: {
          S: { sunThu: 58, friSat: 68 },
          P: { sunThu: 68, friSat: 81 }
        },
        TWOBR: {
          S: { sunThu: 77, friSat: 90 },
          P: { sunThu: 88, friSat: 103 }
        },
        GRANDVILLA: {
          P: { sunThu: 172, friSat: 204 }
        }
      }
    }
  ]
};

// src/data/2027/SSR.json
var SSR_default3 = {
  resortCode: "SSR",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 9, friSat: 14 },
          P: { sunThu: 11, friSat: 16 }
        },
        ONEBR: {
          S: { sunThu: 21, friSat: 27 },
          P: { sunThu: 24, friSat: 30 }
        },
        TWOBR: {
          S: { sunThu: 27, friSat: 34 },
          P: { sunThu: 35, friSat: 39 }
        },
        GRANDVILLA: {
          S: { sunThu: 63, friSat: 72 },
          P: { sunThu: 74, friSat: 84 }
        },
        TREEHOUSE: {
          S: { sunThu: 38, friSat: 43 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 12, friSat: 15 },
          P: { sunThu: 13, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 29 },
          P: { sunThu: 28, friSat: 34 }
        },
        TWOBR: {
          S: { sunThu: 32, friSat: 36 },
          P: { sunThu: 38, friSat: 42 }
        },
        GRANDVILLA: {
          S: { sunThu: 68, friSat: 78 },
          P: { sunThu: 76, friSat: 89 }
        },
        TREEHOUSE: {
          S: { sunThu: 41, friSat: 45 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 13, friSat: 15 },
          P: { sunThu: 15, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 26, friSat: 31 },
          P: { sunThu: 30, friSat: 35 }
        },
        TWOBR: {
          S: { sunThu: 35, friSat: 39 },
          P: { sunThu: 39, friSat: 45 }
        },
        GRANDVILLA: {
          S: { sunThu: 74, friSat: 83 },
          P: { sunThu: 82, friSat: 94 }
        },
        TREEHOUSE: {
          S: { sunThu: 43, friSat: 48 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 16 },
          P: { sunThu: 15, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 28, friSat: 33 },
          P: { sunThu: 32, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 39 },
          P: { sunThu: 41, friSat: 50 }
        },
        GRANDVILLA: {
          S: { sunThu: 77, friSat: 86 },
          P: { sunThu: 87, friSat: 98 }
        },
        TREEHOUSE: {
          S: { sunThu: 44, friSat: 51 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 14, friSat: 17 },
          P: { sunThu: 16, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 34 },
          P: { sunThu: 34, friSat: 39 }
        },
        TWOBR: {
          S: { sunThu: 37, friSat: 45 },
          P: { sunThu: 46, friSat: 54 }
        },
        GRANDVILLA: {
          S: { sunThu: 86, friSat: 97 },
          P: { sunThu: 98, friSat: 112 }
        },
        TREEHOUSE: {
          S: { sunThu: 47, friSat: 52 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 15, friSat: 18 },
          P: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 32, friSat: 36 },
          P: { sunThu: 38, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 41, friSat: 47 },
          P: { sunThu: 49, friSat: 59 }
        },
        GRANDVILLA: {
          S: { sunThu: 93, friSat: 107 },
          P: { sunThu: 108, friSat: 125 }
        },
        TREEHOUSE: {
          S: { sunThu: 51, friSat: 58 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 21, friSat: 25 },
          P: { sunThu: 23, friSat: 28 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 47 },
          P: { sunThu: 49, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 56, friSat: 63 },
          P: { sunThu: 67, friSat: 75 }
        },
        GRANDVILLA: {
          S: { sunThu: 113, friSat: 127 },
          P: { sunThu: 131, friSat: 139 }
        },
        TREEHOUSE: {
          S: { sunThu: 66, friSat: 76 }
        }
      }
    }
  ]
};

// src/data/2027/VB.json
var VB_default3 = {
  resortCode: "VB",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-11-23" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 10, friSat: 16 },
          O: { sunThu: 14, friSat: 17 }
        },
        STUDIO: {
          S: { sunThu: 12, friSat: 17 }
        },
        ONEBR: {
          S: { sunThu: 21, friSat: 29 }
        },
        TWOBR: {
          S: { sunThu: 30, friSat: 39 }
        },
        COTTAGE: {
          S: { sunThu: 60, friSat: 72 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-05-01", end: "2027-05-31" },
        { start: "2027-11-27", end: "2027-12-23" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 10, friSat: 17 },
          O: { sunThu: 15, friSat: 19 }
        },
        STUDIO: {
          S: { sunThu: 13, friSat: 18 }
        },
        ONEBR: {
          S: { sunThu: 24, friSat: 31 }
        },
        TWOBR: {
          S: { sunThu: 33, friSat: 42 }
        },
        COTTAGE: {
          S: { sunThu: 61, friSat: 74 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-06-01", end: "2027-08-31" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 14, friSat: 17 },
          O: { sunThu: 18, friSat: 21 }
        },
        STUDIO: {
          S: { sunThu: 16, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 29, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 36, friSat: 47 }
        },
        COTTAGE: {
          S: { sunThu: 73, friSat: 88 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-13" },
        { start: "2027-04-04", end: "2027-04-30" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 15, friSat: 20 },
          O: { sunThu: 19, friSat: 23 }
        },
        STUDIO: {
          S: { sunThu: 17, friSat: 21 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 44, friSat: 52 }
        },
        COTTAGE: {
          S: { sunThu: 81, friSat: 99 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-02-14", end: "2027-04-03" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        INNROOM: {
          S: { sunThu: 21, friSat: 27 },
          O: { sunThu: 26, friSat: 31 }
        },
        STUDIO: {
          S: { sunThu: 23, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 43, friSat: 53 }
        },
        TWOBR: {
          S: { sunThu: 61, friSat: 72 }
        },
        COTTAGE: {
          S: { sunThu: 105, friSat: 126 }
        }
      }
    }
  ]
};

// src/data/2027/VDH.json
var VDH_default3 = {
  resortCode: "VDH",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 11, friSat: 13 },
          P: { sunThu: 13, friSat: 14 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 16, friSat: 16 },
          P: { sunThu: 19, friSat: 19 }
        },
        ONEBR: {
          S: { sunThu: 30, friSat: 37 },
          P: { sunThu: 30, friSat: 37 }
        },
        TWOBR: {
          S: { sunThu: 43, friSat: 53 },
          P: { sunThu: 43, friSat: 53 }
        },
        GRANDVILLA: {
          S: { sunThu: 96, friSat: 118 },
          P: { sunThu: 96, friSat: 118 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 12, friSat: 15 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 19, friSat: 23 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-05-01", end: "2027-05-22" },
        { start: "2027-08-16", end: "2027-09-15" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 12, friSat: 14 },
          P: { sunThu: 13, friSat: 15 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 15, friSat: 18 },
          P: { sunThu: 18, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 33, friSat: 40 },
          P: { sunThu: 33, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 49, friSat: 59 },
          P: { sunThu: 49, friSat: 59 }
        },
        GRANDVILLA: {
          S: { sunThu: 106, friSat: 128 },
          P: { sunThu: 106, friSat: 128 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 14, friSat: 17 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 21, friSat: 25 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-02-01", end: "2027-03-14" },
        { start: "2027-09-16", end: "2027-09-30" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 13, friSat: 15 },
          P: { sunThu: 14, friSat: 17 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 17, friSat: 20 },
          P: { sunThu: 20, friSat: 24 }
        },
        ONEBR: {
          S: { sunThu: 36, friSat: 42 },
          P: { sunThu: 36, friSat: 42 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 67 },
          P: { sunThu: 52, friSat: 67 }
        },
        GRANDVILLA: {
          S: { sunThu: 122, friSat: 146 },
          P: { sunThu: 122, friSat: 146 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 16, friSat: 19 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 24, friSat: 28 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-05-23", end: "2027-05-31" },
        { start: "2027-10-01", end: "2027-11-22" },
        { start: "2027-11-28", end: "2027-12-17" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 14, friSat: 16 },
          P: { sunThu: 15, friSat: 17 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 20, friSat: 23 },
          P: { sunThu: 23, friSat: 26 }
        },
        ONEBR: {
          S: { sunThu: 40, friSat: 46 },
          P: { sunThu: 40, friSat: 46 }
        },
        TWOBR: {
          S: { sunThu: 60, friSat: 69 },
          P: { sunThu: 60, friSat: 69 }
        },
        GRANDVILLA: {
          S: { sunThu: 129, friSat: 152 },
          P: { sunThu: 129, friSat: 152 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 17, friSat: 20 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 28, friSat: 32 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-06-01", end: "2027-08-15" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 16, friSat: 18 },
          P: { sunThu: 18, friSat: 20 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 23, friSat: 26 },
          P: { sunThu: 26, friSat: 29 }
        },
        ONEBR: {
          S: { sunThu: 42, friSat: 48 },
          P: { sunThu: 42, friSat: 48 }
        },
        TWOBR: {
          S: { sunThu: 65, friSat: 73 },
          P: { sunThu: 65, friSat: 73 }
        },
        GRANDVILLA: {
          S: { sunThu: 149, friSat: 169 },
          P: { sunThu: 149, friSat: 169 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 21, friSat: 23 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 31, friSat: 34 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-03-15", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 18, friSat: 19 },
          P: { sunThu: 24, friSat: 21 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 27, friSat: 27 },
          P: { sunThu: 30, friSat: 30 }
        },
        ONEBR: {
          S: { sunThu: 42, friSat: 50 },
          P: { sunThu: 42, friSat: 50 }
        },
        TWOBR: {
          S: { sunThu: 65, friSat: 75 },
          P: { sunThu: 65, friSat: 75 }
        },
        GRANDVILLA: {
          S: { sunThu: 149, friSat: 174 },
          P: { sunThu: 149, friSat: 174 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 21, friSat: 24 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 31, friSat: 35 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-11-23", end: "2027-11-26" },
        { start: "2027-12-18", end: "2027-12-31" }
      ],
      points: {
        DUOSTUDIO: {
          S: { sunThu: 22, friSat: 25 },
          P: { sunThu: 24, friSat: 27 }
        },
        DELUXESTUDIO: {
          S: { sunThu: 28, friSat: 31 },
          P: { sunThu: 31, friSat: 34 }
        },
        ONEBR: {
          S: { sunThu: 54, friSat: 62 },
          P: { sunThu: 54, friSat: 62 }
        },
        TWOBR: {
          S: { sunThu: 82, friSat: 92 },
          P: { sunThu: 82, friSat: 92 }
        },
        GRANDVILLA: {
          S: { sunThu: 174, friSat: 204 },
          P: { sunThu: 174, friSat: 204 }
        },
        GARDENDUOSTUDIO: {
          S: { sunThu: 26, friSat: 30 }
        },
        GARDENDELUXESTUDIO: {
          S: { sunThu: 37, friSat: 41 }
        }
      }
    }
  ]
};

// src/data/2027/VGC.json
var VGC_default3 = {
  resortCode: "VGC",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-01-03", end: "2027-02-27" },
        { start: "2027-09-05", end: "2027-09-30" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 17, friSat: 22 }
        },
        ONEBR: {
          S: { sunThu: 31, friSat: 40 }
        },
        TWOBR: {
          S: { sunThu: 46, friSat: 56 }
        },
        GRANDVILLA: {
          S: { sunThu: 94, friSat: 119 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-04-04", end: "2027-06-27" },
        { start: "2027-10-01", end: "2027-11-22" },
        { start: "2027-11-28", end: "2027-12-16" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 20, friSat: 24 }
        },
        ONEBR: {
          S: { sunThu: 39, friSat: 48 }
        },
        TWOBR: {
          S: { sunThu: 52, friSat: 65 }
        },
        GRANDVILLA: {
          S: { sunThu: 106, friSat: 133 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-02-28", end: "2027-03-18" },
        { start: "2027-06-28", end: "2027-09-04" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 26, friSat: 32 }
        },
        ONEBR: {
          S: { sunThu: 52, friSat: 64 }
        },
        TWOBR: {
          S: { sunThu: 70, friSat: 88 }
        },
        GRANDVILLA: {
          S: { sunThu: 152, friSat: 188 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-01-01", end: "2027-01-02" },
        { start: "2027-03-19", end: "2027-04-03" },
        { start: "2027-11-23", end: "2027-11-27" },
        { start: "2027-12-17", end: "2027-12-31" }
      ],
      points: {
        STUDIO: {
          S: { sunThu: 30, friSat: 37 }
        },
        ONEBR: {
          S: { sunThu: 62, friSat: 76 }
        },
        TWOBR: {
          S: { sunThu: 86, friSat: 108 }
        },
        GRANDVILLA: {
          S: { sunThu: 182, friSat: 224 }
        }
      }
    }
  ]
};

// src/data/2027/VGF.json
var VGF_default3 = {
  resortCode: "VGF",
  year: 2027,
  periods: [
    {
      id: 1,
      name: "Travel Period 1",
      ranges: [
        { start: "2027-09-01", end: "2027-09-30" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 16, friSat: 20 },
          P: { sunThu: 19, friSat: 24 },
          TP: { sunThu: 24, friSat: 27 }
        },
        STUDIO: {
          R: { sunThu: 16, friSat: 20 },
          P: { sunThu: 19, friSat: 24 }
        },
        ONEBR: {
          R: { sunThu: 31, friSat: 41 },
          P: { sunThu: 39, friSat: 48 }
        },
        TWOBR: {
          R: { sunThu: 44, friSat: 55 },
          P: { sunThu: 54, friSat: 65 }
        },
        GRANDVILLA: {
          P: { sunThu: 111, friSat: 131 }
        }
      }
    },
    {
      id: 2,
      name: "Travel Period 2",
      ranges: [
        { start: "2027-01-01", end: "2027-01-31" },
        { start: "2027-05-01", end: "2027-05-14" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 24 },
          TP: { sunThu: 25, friSat: 29 }
        },
        STUDIO: {
          R: { sunThu: 17, friSat: 20 },
          P: { sunThu: 21, friSat: 24 }
        },
        ONEBR: {
          R: { sunThu: 36, friSat: 44 },
          P: { sunThu: 43, friSat: 51 }
        },
        TWOBR: {
          R: { sunThu: 49, friSat: 58 },
          P: { sunThu: 59, friSat: 68 }
        },
        GRANDVILLA: {
          P: { sunThu: 118, friSat: 138 }
        }
      }
    },
    {
      id: 3,
      name: "Travel Period 3",
      ranges: [
        { start: "2027-05-15", end: "2027-06-10" },
        { start: "2027-12-01", end: "2027-12-23" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 21, friSat: 26 },
          TP: { sunThu: 26, friSat: 31 }
        },
        STUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 21, friSat: 26 }
        },
        ONEBR: {
          R: { sunThu: 38, friSat: 46 },
          P: { sunThu: 46, friSat: 55 }
        },
        TWOBR: {
          R: { sunThu: 53, friSat: 61 },
          P: { sunThu: 62, friSat: 74 }
        },
        GRANDVILLA: {
          P: { sunThu: 126, friSat: 148 }
        }
      }
    },
    {
      id: 4,
      name: "Travel Period 4",
      ranges: [
        { start: "2027-02-01", end: "2027-02-15" },
        { start: "2027-06-11", end: "2027-08-31" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 22, friSat: 27 },
          TP: { sunThu: 28, friSat: 32 }
        },
        STUDIO: {
          R: { sunThu: 18, friSat: 21 },
          P: { sunThu: 22, friSat: 27 }
        },
        ONEBR: {
          R: { sunThu: 41, friSat: 48 },
          P: { sunThu: 49, friSat: 57 }
        },
        TWOBR: {
          R: { sunThu: 56, friSat: 65 },
          P: { sunThu: 66, friSat: 78 }
        },
        GRANDVILLA: {
          P: { sunThu: 131, friSat: 155 }
        }
      }
    },
    {
      id: 5,
      name: "Travel Period 5",
      ranges: [
        { start: "2027-10-01", end: "2027-11-23" },
        { start: "2027-11-27", end: "2027-11-30" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 22, friSat: 24 },
          P: { sunThu: 26, friSat: 29 },
          TP: { sunThu: 32, friSat: 36 }
        },
        STUDIO: {
          R: { sunThu: 22, friSat: 24 },
          P: { sunThu: 26, friSat: 29 }
        },
        ONEBR: {
          R: { sunThu: 43, friSat: 51 },
          P: { sunThu: 53, friSat: 61 }
        },
        TWOBR: {
          R: { sunThu: 61, friSat: 69 },
          P: { sunThu: 73, friSat: 82 }
        },
        GRANDVILLA: {
          P: { sunThu: 143, friSat: 169 }
        }
      }
    },
    {
      id: 6,
      name: "Travel Period 6",
      ranges: [
        { start: "2027-02-16", end: "2027-03-20" },
        { start: "2027-03-29", end: "2027-04-30" },
        { start: "2027-11-24", end: "2027-11-26" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 24, friSat: 26 },
          P: { sunThu: 27, friSat: 32 },
          TP: { sunThu: 34, friSat: 41 }
        },
        STUDIO: {
          R: { sunThu: 24, friSat: 26 },
          P: { sunThu: 27, friSat: 32 }
        },
        ONEBR: {
          R: { sunThu: 46, friSat: 55 },
          P: { sunThu: 55, friSat: 66 }
        },
        TWOBR: {
          R: { sunThu: 65, friSat: 75 },
          P: { sunThu: 75, friSat: 88 }
        },
        GRANDVILLA: {
          P: { sunThu: 161, friSat: 187 }
        }
      }
    },
    {
      id: 7,
      name: "Travel Period 7",
      ranges: [
        { start: "2027-03-21", end: "2027-03-28" },
        { start: "2027-12-24", end: "2027-12-31" }
      ],
      points: {
        RESORTSTUDIO: {
          R: { sunThu: 32, friSat: 37 },
          P: { sunThu: 38, friSat: 44 },
          TP: { sunThu: 47, friSat: 54 }
        },
        STUDIO: {
          R: { sunThu: 32, friSat: 37 },
          P: { sunThu: 38, friSat: 44 }
        },
        ONEBR: {
          R: { sunThu: 64, friSat: 75 },
          P: { sunThu: 76, friSat: 89 }
        },
        TWOBR: {
          R: { sunThu: 87, friSat: 103 },
          P: { sunThu: 103, friSat: 122 }
        },
        GRANDVILLA: {
          P: { sunThu: 197, friSat: 227 }
        }
      }
    }
  ]
};

// src/data/chartRegistry.ts
var chartRegistry = {
  "2025": {
    AKV: AKV_default,
    AUL: AUL_default,
    BCV: BCV_default,
    BLT: BLT_default,
    BRV: BRV_default,
    BWV: BWV_default,
    CCV: CCV_default,
    HHI: HHI_default,
    OKW: OKW_default,
    PVB: PVB_default,
    RVA: RVA_default,
    SSR: SSR_default,
    VB: VB_default,
    VDH: VDH_default,
    VGC: VGC_default,
    VGF: VGF_default
  },
  "2026": {
    AKV: AKV_default2,
    AUL: AUL_default2,
    BCV: BCV_default2,
    BLT: BLT_default2,
    BRV: BRV_default2,
    BWV: BWV_default2,
    CCV: CCV_default2,
    HHI: HHI_default2,
    OKW: OKW_default2,
    PVB: PVB_default2,
    RVA: RVA_default2,
    SSR: SSR_default2,
    VB: VB_default2,
    VDH: VDH_default2,
    VGC: VGC_default2,
    VGF: VGF_default2
  },
  "2027": {
    AKV: AKV_default3,
    AUL: AUL_default3,
    BCV: BCV_default3,
    BLT: BLT_default3,
    BRV: BRV_default3,
    BWV: BWV_default3,
    CCV: CCV_default3,
    CFW: CFW_default,
    HHI: HHI_default3,
    OKW: OKW_default3,
    PVB: PVB_default3,
    RVA: RVA_default3,
    SSR: SSR_default3,
    VB: VB_default3,
    VDH: VDH_default3,
    VGC: VGC_default3,
    VGF: VGF_default3
  }
};
function getResortYearChart(resortCode, year) {
  const yearData = chartRegistry[year.toString()];
  if (yearData?.[resortCode])
    return yearData[resortCode];
  const fallbackYearData = chartRegistry["2026"];
  return fallbackYearData?.[resortCode] ?? null;
}

// src/engine/charts.ts
var Resorts = resortsData;
function loadResortYearChart(resortCode, year) {
  return getResortYearChart(resortCode, year);
}

// src/engine/date-utils.ts
function parseISO(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${input}`);
  }
  return date;
}
function formatISO(date, options) {
  const iso = date.toISOString();
  if (options?.representation === "date") {
    return iso.split("T")[0];
  }
  return iso;
}
function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}
function differenceInMonths(later, earlier) {
  return (later.getFullYear() - earlier.getFullYear()) * 12 + (later.getMonth() - earlier.getMonth());
}
function isWithinInterval(date, interval) {
  const time = date.getTime();
  return time >= interval.start.getTime() && time <= interval.end.getTime();
}

// src/engine/calc.ts
function calculatePricePerPoint(resortCode, checkInDate, bookingDate) {
  const meta = Resorts.find((r) => r.code === resortCode);
  if (!meta)
    throw new Error(`Unknown resort ${resortCode}`);
  if (meta.category === "SELECT_ACCESS" || meta.category === "VALUE_ACCESS") {
    return {
      ppp: RATE_BY_CATEGORY[meta.category],
      tierName: TIER_DISPLAY_NAMES[meta.category]
    };
  }
  const checkIn = parseISO(checkInDate);
  const bookingDateParsed = bookingDate ? parseISO(bookingDate) : /* @__PURE__ */ new Date();
  const monthsInAdvance = differenceInMonths(checkIn, bookingDateParsed);
  if (monthsInAdvance < 7) {
    return {
      ppp: RATE_BY_CATEGORY.SELECT_ACCESS,
      tierName: TIER_DISPLAY_NAMES.SELECT_ACCESS
    };
  }
  return {
    ppp: RATE_BY_CATEGORY[meta.category],
    tierName: TIER_DISPLAY_NAMES[meta.category]
  };
}
function periodForDate(chart, iso) {
  const d = parseISO(iso);
  for (const p of chart.periods) {
    for (const r of p.ranges) {
      const s = parseISO(r.start), e = parseISO(r.end);
      if (isWithinInterval(d, { start: s, end: e }))
        return p;
    }
  }
  return null;
}
function pointsForNight(period, room, view, iso) {
  if (!period)
    return 0;
  const rate = period.points?.[room]?.[view];
  if (!rate)
    return 0;
  const dow = parseISO(iso).getDay();
  const isFriSat = dow === 5 || dow === 6;
  return isFriSat ? rate.friSat : rate.sunThu;
}
function quoteStay(input) {
  const { resortCode, room, view, checkIn, nights, bookingDate } = input;
  const { ppp, tierName } = calculatePricePerPoint(resortCode, checkIn, bookingDate);
  let totalPoints = 0;
  const nightly = [];
  const chartCache = /* @__PURE__ */ new Map();
  for (let i = 0; i < nights; i++) {
    const iso = formatISO(addDays(parseISO(checkIn), i), { representation: "date" });
    const chartYear = Number(iso.slice(0, 4));
    let chart = chartCache.get(chartYear);
    if (!chart) {
      chart = loadResortYearChart(resortCode, chartYear) ?? void 0;
      if (!chart) {
        throw new Error(`No chart for ${resortCode} in ${chartYear}`);
      }
      chartCache.set(chartYear, chart);
    }
    const period = periodForDate(chart, iso);
    if (!period) {
      throw new Error(`No travel period found for date ${iso} at ${resortCode}`);
    }
    const pts = pointsForNight(period, room, view, iso);
    if (pts === 0) {
      throw new Error(`No points data for ${room}/${view} on ${iso} at ${resortCode}`);
    }
    totalPoints += pts;
    nightly.push({ date: iso, points: pts, periodId: period?.id ?? null });
  }
  const baseUSD = totalPoints * ppp;
  const feeUSD = baseUSD * (SERVICE_FEE_PCT / 100);
  const totalUSD = baseUSD + feeUSD;
  return {
    totalPoints,
    nightly,
    pppUSD: ppp,
    feePct: SERVICE_FEE_PCT,
    baseUSD: Number(baseUSD.toFixed(2)),
    feeUSD: Number(feeUSD.toFixed(2)),
    totalUSD: Number(totalUSD.toFixed(2)),
    pricingTier: tierName
  };
}
async function quoteAllResorts(params) {
  const results = {};
  for (const r of Resorts) {
    const combos = params.roomViews[r.code] ?? [{ room: "STUDIO", view: "S" }];
    results[r.code] = {};
    for (const combo of combos) {
      results[r.code][`${combo.room}`] = await quoteStay({
        resortCode: r.code,
        room: combo.room,
        view: combo.view,
        checkIn: params.checkIn,
        nights: params.nights,
        year: params.year,
        chartYear: params.chartYear
      });
    }
  }
  return results;
}
export {
  RATE_BY_CATEGORY,
  Resorts,
  SERVICE_FEE_PCT,
  TIER_DISPLAY_NAMES,
  getResortYearChart,
  loadResortYearChart,
  quoteAllResorts,
  quoteStay,
  resortsData
};
//# sourceMappingURL=index.js.map