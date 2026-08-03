export function canOwnerViewMatchGuestContact({
  matchStatus,
  rentalId,
}: {
  matchStatus: string | null | undefined;
  rentalId?: string | null;
}) {
  return matchStatus === "accepted" || matchStatus === "booked" || Boolean(rentalId);
}

export function isOwnerRentalDocumentStoragePath({
  storagePath,
  userId,
  rentalId,
}: {
  storagePath: string;
  userId: string;
  rentalId: string;
}) {
  return storagePath.trim().startsWith(`owners/${userId}/rental-docs/${rentalId}/`);
}
