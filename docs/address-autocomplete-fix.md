# Public booking address autocomplete

The production build for commit `097c743` received an empty browser Places key.
Next.js compiled the hook into a no-op: the guest-details page had no Maps
script, provider requests, or `.pac-container` after typing `3266 sh`.
The Cloud Run runtime environment had a key, but runtime values cannot populate
already compiled `NEXT_PUBLIC_*` browser code.

Production now reads `PRODUCTION_NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` through
Cloud Build Secret Manager integration and a BuildKit secret mount. Missing
configuration fails the build. Values are not passed through substitutions or
printed build arguments. The existing browser key in the Maps project allows
`https://hannadvc.com/*`, `https://www.hannadvc.com/*`, and its existing
`http://localhost:3005/*` origin. Existing API restrictions are preserved. The
server key is not used for the browser bundle.

The shared hook retains its selection listener across form renders, updates
country restrictions on the existing widget, and attaches to the new input
when animated booking sections remount. Disabled/unconfigured autocomplete
leaves ordinary address entry available. The booking form supplies the actual
mounted input because AnimatePresence can mount it after the parent effect.

Country filtering follows the Country selection (United States by default).
Select Canada before looking up Canadian addresses. Unsupported country names
leave the provider unrestricted.

Focused integration tests cover selecting an address after typing and changing
country, all five populated fields, manual editing, returning from travel party,
and unavailable/disabled configuration. The Fort Wilderness calculator regression
remains Dec 31, 2026–Jan 2, 2027, Cabin / Standard: 51 points and $1,224 USD.

References: [Cloud Build secrets](https://docs.cloud.google.com/build/docs/securing-builds/use-secrets),
[Docker build secrets](https://docs.docker.com/build/building/secrets/), and
[Google address autocomplete](https://developers.google.com/maps/documentation/javascript/legacy/place-autocomplete).
