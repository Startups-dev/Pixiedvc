import { useEffect, useRef } from "react";

import { isPlacesAvailable, loadGooglePlaces, parseGooglePlace, type PlaceAddress } from "@/lib/google-places";

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
        getPlace: () => unknown;
      };
    };
  };
};

type Options = {
  inputRef: React.RefObject<HTMLInputElement>;
  onSelect: (address: PlaceAddress) => void;
  debugLabel?: string;
  countryCode?: string;
};

export function usePlacesAutocomplete({ inputRef, onSelect, debugLabel, countryCode }: Options) {
  const autocompleteRef = useRef<unknown>(null);
  const listenerRef = useRef<{ remove?: () => void } | null>(null);
  const countryRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

    if (process.env.NODE_ENV !== "production") {
      console.info(`[places] api key present (${debugLabel ?? "unknown"}):`, Boolean(apiKey));
    }

    if (!apiKey) return;
    if (!inputRef.current) return;

    let cancelled = false;

    loadGooglePlaces(apiKey)
      .then(() => {
        if (cancelled) return;
        if (!inputRef.current) return;

        if (!isPlacesAvailable()) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              `[places] Google Places unavailable (${debugLabel ?? "unknown"}):`,
              {
                hasWindowGoogle: Boolean((window as Window & { google?: GoogleNamespace }).google),
                hasPlaces: false,
              }
            );
          }
          return;
        }

        if (autocompleteRef.current && countryRef.current === countryCode) return;

        const google = (window as Window & { google?: GoogleNamespace }).google;
        if (!google?.maps?.places) return;

        if (autocompleteRef.current && countryRef.current !== countryCode) {
          listenerRef.current?.remove?.();
          listenerRef.current = null;
          autocompleteRef.current = null;
        }

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          fields: ["address_components", "formatted_address"],
          ...(countryCode ? { componentRestrictions: { country: countryCode } } : {}),
        });
        autocompleteRef.current = autocomplete;
        countryRef.current = countryCode;
        listenerRef.current = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          onSelect(
            parseGooglePlace(
              place as {
                formatted_address?: string;
                address_components?: { long_name?: string; short_name?: string; types?: string[] }[];
              }
            )
          );
        });
      })
      .catch(() => {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[places] Failed to load Google Places script (${debugLabel ?? "unknown"}).`);
        }
      });

    if (process.env.NODE_ENV !== "production" && !isPlacesAvailable()) {
      const google = (window as Window & { google?: GoogleNamespace }).google;
      console.warn(`[places] Google Places unavailable (${debugLabel ?? "unknown"}).`, {
        hasWindowGoogle: Boolean(google),
        hasPlaces: Boolean(google?.maps?.places),
      });
    }

    return () => {
      cancelled = true;
      listenerRef.current?.remove?.();
      listenerRef.current = null;
    };
  }, [debugLabel, inputRef, onSelect]);
}
