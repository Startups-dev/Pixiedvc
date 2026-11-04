import { useEffect, useRef } from "react";

import { loadGooglePlaces, parseGooglePlace, type PlaceAddress } from "@/lib/google-places";

type Autocomplete = {
  addListener: (event: string, handler: () => void) => { remove?: () => void };
  getPlace: () => Parameters<typeof parseGooglePlace>[0];
  setComponentRestrictions: (restrictions: { country: string | string[] }) => void;
};

type GoogleNamespace = {
  maps?: {
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: {
          types: string[];
          fields: string[];
          componentRestrictions?: { country: string };
        }
      ) => Autocomplete;
    };
  };
};

type Options = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputElement?: HTMLInputElement | null;
  onSelect: (address: PlaceAddress) => void;
  debugLabel?: string;
  countryCode?: string;
  disabled?: boolean;
};

export function usePlacesAutocomplete({ inputRef, inputElement, onSelect, debugLabel, countryCode, disabled = false }: Options) {
  const instanceRef = useRef<{ input: HTMLInputElement; widget: Autocomplete; country?: string } | null>(null);
  const listenerRef = useRef<{ remove?: () => void } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const normalizedCountryCode = countryCode?.trim().toLowerCase();

  // Reconcile after each commit: the same ref can point to a new input when a
  // booking section remounts. Typing must not detach the place_changed listener.
  useEffect(() => {
    const input = inputElement === undefined ? inputRef.current : inputElement;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";
    if (disabled || !input || !apiKey) {
      listenerRef.current?.remove?.();
      listenerRef.current = null;
      instanceRef.current = null;
      return;
    }

    const existing = instanceRef.current;
    if (existing?.input === input) {
      if (existing.country !== normalizedCountryCode) {
        existing.widget.setComponentRestrictions({ country: normalizedCountryCode || [] });
        existing.country = normalizedCountryCode;
      }
      return;
    }

    listenerRef.current?.remove?.();
    listenerRef.current = null;
    instanceRef.current = null;
    let cancelled = false;

    loadGooglePlaces(apiKey)
      .then(() => {
        if (cancelled || inputRef.current !== input) return;
        const google = (window as Window & { google?: GoogleNamespace }).google;
        if (!google?.maps?.places) return;

        const widget = new google.maps.places.Autocomplete(input, {
          types: ["address"],
          fields: ["address_components", "formatted_address"],
          ...(normalizedCountryCode ? { componentRestrictions: { country: normalizedCountryCode } } : {}),
        });
        instanceRef.current = { input, widget, country: normalizedCountryCode };
        listenerRef.current = widget.addListener("place_changed", () => {
          onSelectRef.current(parseGooglePlace(widget.getPlace()));
        });
      })
      .catch(() => {
        // Keep the ordinary text input usable if the provider cannot load.
        console.warn(`[places] Address suggestions unavailable (${debugLabel ?? "unknown"}).`);
      });

    return () => { cancelled = true; };
  });

  useEffect(() => () => {
    listenerRef.current?.remove?.();
    listenerRef.current = null;
    instanceRef.current = null;
  }, []);
}
