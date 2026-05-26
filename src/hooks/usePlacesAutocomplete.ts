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
  disabled?: boolean;
};

export function usePlacesAutocomplete({ inputRef, onSelect, debugLabel, countryCode, disabled = false }: Options) {
  const autocompleteRef = useRef<unknown>(null);
  const listenerRef = useRef<{ remove?: () => void } | null>(null);
  const countryRef = useRef<string | undefined>(undefined);
  const normalizedCountryCode = countryCode?.trim().toLowerCase();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (disabled) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

    if (process.env.NODE_ENV !== "production") {
      console.info(`[places] api key present (${debugLabel ?? "unknown"}):`, Boolean(apiKey));
    }

    if (!apiKey) return;
    if (!inputRef.current) return;

    if (debugLabel === "onboarding") {
      console.info("[places-debug]", {
        stage: "effect_start",
        debugLabel,
        disabled,
        hasInput: Boolean(inputRef.current),
        countryCode: normalizedCountryCode ?? null,
        hasApiKey: Boolean(apiKey),
      });
    }

    let cancelled = false;

    loadGooglePlaces(apiKey)
      .then(() => {
        if (cancelled) return;
        if (!inputRef.current) return;

        if (!isPlacesAvailable()) {
          if (debugLabel === "onboarding") {
            console.warn("[places-debug]", {
              stage: "places_unavailable",
              debugLabel,
              countryCode: normalizedCountryCode ?? null,
            });
          }
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

        if (autocompleteRef.current && countryRef.current === normalizedCountryCode) {
          if (debugLabel === "onboarding") {
            console.info("[places-debug]", {
              stage: "reuse_existing_instance",
              debugLabel,
              countryCode: normalizedCountryCode ?? null,
            });
          }
          return;
        }

        const google = (window as Window & { google?: GoogleNamespace }).google;
        if (!google?.maps?.places) return;

        if (autocompleteRef.current && countryRef.current !== normalizedCountryCode) {
          if (debugLabel === "onboarding") {
            console.info("[places-debug]", {
              stage: "reset_instance_for_country_change",
              debugLabel,
              previousCountryCode: countryRef.current ?? null,
              nextCountryCode: normalizedCountryCode ?? null,
            });
          }
          listenerRef.current?.remove?.();
          listenerRef.current = null;
          autocompleteRef.current = null;
        }

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          fields: ["address_components", "formatted_address"],
          ...(normalizedCountryCode ? { componentRestrictions: { country: normalizedCountryCode } } : {}),
        });
        if (debugLabel === "onboarding") {
          console.info("[places-debug]", {
            stage: "instance_created",
            debugLabel,
            countryCode: normalizedCountryCode ?? null,
          });
        }
        autocompleteRef.current = autocomplete;
        countryRef.current = normalizedCountryCode;
        listenerRef.current = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (debugLabel === "onboarding") {
            console.info("[places-debug]", {
              stage: "place_changed",
              debugLabel,
              countryCode: normalizedCountryCode ?? null,
              hasFormattedAddress: Boolean(
                (place as { formatted_address?: string }).formatted_address
              ),
            });
          }
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
        if (debugLabel === "onboarding") {
          console.warn("[places-debug]", {
            stage: "script_load_failed",
            debugLabel,
            countryCode: normalizedCountryCode ?? null,
          });
        }
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
  }, [debugLabel, disabled, inputRef, normalizedCountryCode, onSelect]);
}
