const DEFAULT_WELCOME_DAY_0_HERO_IMAGE_URL =
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Newsletter%20images/Welcome%20email/welcome%201.png';

const DEFAULT_WELCOME_DAY_0_SECONDARY_IMAGE_URL =
  'https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Newsletter%20images/Welcome%20email/welcome%202.png';

export function getWelcomeSequenceAssetUrls() {
  return {
    welcomeDay0HeroImageUrl:
      process.env.WELCOME_SEQUENCE_DAY_0_HERO_IMAGE_URL?.trim() || DEFAULT_WELCOME_DAY_0_HERO_IMAGE_URL,
    welcomeDay0SecondaryImageUrl:
      process.env.WELCOME_SEQUENCE_DAY_0_SECONDARY_IMAGE_URL?.trim() || DEFAULT_WELCOME_DAY_0_SECONDARY_IMAGE_URL,
  };
}
