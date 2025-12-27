export const TEMPLATE_OPTIONS = [
  { label: 'Owner agreement (no reservation)', value: 'owner_no_reservation.txt' },
  { label: 'Owner agreement (with reservation)', value: 'owner_with_reservation.txt' },
] as const;

export const DEFAULT_TEMPLATE_NAME = TEMPLATE_OPTIONS[0].value;
