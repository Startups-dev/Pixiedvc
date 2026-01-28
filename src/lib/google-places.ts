type GoogleNamespace = {
  maps?: {
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options?: {
          types?: string[];
          fields?: string[];
        }
      ) => {
        addListener: (event: string, handler: () => void) => { remove?: () => void };
        getPlace: () => PlaceResult;
      };
    };
    event?: {
      clearInstanceListeners?: (instance: unknown) => void;
    };
  };
};

type PlaceComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type PlaceResult = {
  formatted_address?: string;
  address_components?: PlaceComponent[];
};

export type PlaceAddress = {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
};

const GOOGLE_SCRIPT_ID = "google-places-script";

function getGoogleNamespace(): GoogleNamespace | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { google?: GoogleNamespace }).google;
}

export async function loadGooglePlaces(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!apiKey) return;

  const google = getGoogleNamespace();
  if (google?.maps?.places) return;

  const win = window as Window & { __googlePlacesPromise?: Promise<void> };
  if (win.__googlePlacesPromise) {
    await win.__googlePlacesPromise;
    return;
  }

  const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === "true") {
    return;
  }

  const script =
    existing ??
    Object.assign(document.createElement("script"), {
      id: GOOGLE_SCRIPT_ID,
      async: true,
      defer: true,
    });

  if (!existing) {
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    document.head.appendChild(script);
  }

  win.__googlePlacesPromise = new Promise<void>((resolve, reject) => {
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => {
        reject(new Error("Failed to load Google Places script."));
      },
      { once: true }
    );
  });

  await win.__googlePlacesPromise;
}

function findComponent(components: PlaceComponent[] | undefined, type: string) {
  return components?.find((component) => component.types?.includes(type));
}

export function parseGooglePlace(place: PlaceResult): PlaceAddress {
  const streetNumber = findComponent(place.address_components, "street_number")?.long_name ?? "";
  const route = findComponent(place.address_components, "route")?.long_name ?? "";
  const city =
    findComponent(place.address_components, "locality")?.long_name ??
    findComponent(place.address_components, "postal_town")?.long_name ??
    findComponent(place.address_components, "sublocality")?.long_name ??
    "";
  const state = findComponent(place.address_components, "administrative_area_level_1")?.short_name ?? "";
  const postalCode = findComponent(place.address_components, "postal_code")?.long_name ?? "";
  const country = findComponent(place.address_components, "country")?.long_name ?? "";

  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();

  return {
    line1: line1 || place.formatted_address || undefined,
    city: city || undefined,
    state: state || undefined,
    postalCode: postalCode || undefined,
    country: country || undefined,
    formatted: place.formatted_address || undefined,
  };
}

export function isPlacesAvailable() {
  const google = getGoogleNamespace();
  return Boolean(google?.maps?.places);
}
