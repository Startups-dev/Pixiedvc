import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

function esc(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type SignatureStampOptions = {
  guestAcceptedAt?: string | null;
  acceptanceIp?: string | null;
  acceptanceId?: string | number | null;
  timeZone?: string | null;
};

function formatStampTime(value: string, timeZone?: string | null) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const tz = timeZone ?? process.env.APP_TIMEZONE ?? 'America/New_York';
  const dateText = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    timeZone: tz,
  }).format(date);

  const timeParts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
    timeZoneName: tz ? 'short' : undefined,
  }).formatToParts(date);

  const timeValue = timeParts
    .filter((part) => ['hour', 'minute', 'dayPeriod'].includes(part.type))
    .map((part) => part.value)
    .join('');
  const zoneValue =
    timeParts.find((part) => part.type === 'timeZoneName')?.value ?? null;
  const zoneLabel = zoneValue ? zoneValue.replace('EDT', 'ET').replace('EST', 'ET') : null;
  const timeText = zoneLabel ? `${timeValue} ${zoneLabel}` : timeValue;

  return { dateText, timeText };
}

export function renderPixieAgreementHTML(
  snapshot: ContractSnapshot,
  signature?: SignatureStampOptions,
) {
  const summary = snapshot.summary;
  const derivedPricePerPoint = summary.guestPricePerPointCents / 100;
  const derivedTotalUsd = summary.totalPayableByGuestCents / 100;
  const derivedAmountPaidUsd = summary.paidNowCents / 100;
  const derivedBalanceOwedUsd = summary.balanceOwingCents / 100;

  const adults = snapshot.occupancy.adults.length
    ? snapshot.occupancy.adults.map((name) => `<li>${esc(name)}</li>`).join('')
    : '<li>—</li>';

  const youths = snapshot.occupancy.youths.length
    ? snapshot.occupancy.youths.map((name) => `<li>${esc(name)}</li>`).join('')
    : '<li>—</li>';

  const effectiveDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(new Date(snapshot.effectiveDate || Date.now()));

  const guestSignature = (() => {
    if (!signature?.guestAcceptedAt) {
      return `<span style="display:inline-block; min-width: 220px; border-bottom: 1px solid #111; padding-bottom: 4px;"></span>`;
    }

    const stamp = formatStampTime(signature.guestAcceptedAt, signature.timeZone);
    if (!stamp) {
      return `<span style="display:inline-block; min-width: 220px; border-bottom: 1px solid #111; padding-bottom: 4px;"></span>`;
    }

    const stampText = `Electronically signed by ${esc(snapshot.parties.guest.fullName)} on ${esc(
      stamp.dateText,
    )} at ${esc(stamp.timeText)}`;

    const lines: string[] = [];
    if (signature.acceptanceIp) {
      lines.push(`Acceptance IP: ${esc(signature.acceptanceIp)}`);
    }
    if (signature.acceptanceId) {
      lines.push(`Acceptance ID: ${esc(signature.acceptanceId)}`);
    }

    const meta = lines.length
      ? `<div style="margin-top: 4px; font-size: 10px; color: #555;">${lines.join('<br/>')}</div>`
      : '';

    return `
      <span style="display:inline-flex; align-items:center; border:1px solid #cfd7e6; background:#f5f7fb; color:#1f2937; font-size:11px; font-variant:small-caps; padding:6px 10px; border-radius:999px;">
        ${stampText}
      </span>
      ${meta}
    `;
  })();

  return `
  <div id="rental-agreement" style="font-family: ui-sans-serif, system-ui, -apple-system; font-size: 12px; line-height: 1.45;">
    <style>
      h3 { margin: 14px 0 6px; }
      p { margin: 0 0 10px; }
      ul { margin: 0 0 10px 18px; }
    </style>
    <p>This Rental Agreement (“Agreement”) is entered into as of <b>${esc(effectiveDate)}</b> (“Effective Date”).</p>

    <h3>Parties</h3>
    <p>
      <b>Renter:</b> ${esc(snapshot.parties.guest.fullName)}<br/>
      <b>Owner:</b> ${esc(snapshot.parties.owner.fullName)}<br/>
      <b>Intermediary:</b> Pixie DVC (“Pixie DVC”)<br/>
    </p>

    <h3>1. Nature of the Transaction</h3>
    <p>This Agreement governs the rental of Disney Vacation Club (“DVC”) points owned by the Owner and arranged through Pixie DVC. The rental provides accommodations only for the dates confirmed. This Agreement does not include park tickets, transportation, meals, insurance, or other travel services unless separately purchased by the Renter under Disney’s own terms and conditions.</p>

    <h3>2. Final Sale / No Refunds</h3>
    <p>All rentals under this Agreement are final and non-refundable, except where expressly stated herein. Once confirmed, pricing may not be increased for any reason.</p>

    <h3>3. Acceptance by Payment</h3>
    <p>Payment in full by the Renter constitutes full acceptance of this Agreement and all applicable policies. Pixie DVC has received from Renter a non-refundable payment of <b>${money(derivedAmountPaidUsd)}</b> in exchange for securing a confirmed reservation using the Owner’s DVC points.</p>

    <h3>4. Reservation Details</h3>
    <ul>
      <li><b>Resort:</b> ${esc(summary.resortName)}</li>
      <li><b>Accommodation Type:</b> ${esc(summary.accommodationType)}</li>
      <li><b>Check-In Date:</b> ${esc(summary.checkIn)}</li>
      <li><b>Check-Out Date:</b> ${esc(summary.checkOut)}</li>
      <li><b>Disney Confirmation Number:</b> ${esc(summary.reservationNumber ?? '—')}</li>
    </ul>

    <h3>5. Occupancy</h3>
    <p><b>Adult Guests</b></p>
    <ul>${adults}</ul>
    <p><b>Youth Guests</b></p>
    <ul>${youths}</ul>
    <p>Renter agrees not to exceed Disney’s maximum occupancy limits.</p>

    <h3>6. Insurance Advisory</h3>
    <p>Renter acknowledges that Pixie DVC has recommended consideration of trip cancellation insurance, particularly for cancellations close to arrival. Renters residing outside the United States are further advised to obtain travel medical insurance.</p>

    <h3>7. Disney Operations and Amenities</h3>
    <p>Pixie DVC and the Owner are not responsible for changes, interruptions, or closures affecting resort operations or amenities imposed by Disney Vacation Club or The Walt Disney Company, including construction, refurbishment, reduced services, or modified access to facilities.</p>

    <h3>8. Room Assignment</h3>
    <p>All room locations, views, and specific requests are assigned solely by Disney. Pixie DVC and the Owner make no guarantees regarding room preferences.</p>

    <h3>9. Smoking Policy</h3>
    <p>All DVC accommodations, including balconies and patios, are strictly non-smoking. Any cleaning fees, penalties, or charges assessed by Disney due to violation of this policy shall be the sole responsibility of the Renter.</p>

    <h3>10. Reservation Management</h3>
    <p>Renter is responsible for creating and managing a My Disney Experience account, ensuring a valid credit card is linked at check-in, and payment of all incidental charges during the stay. Requests for guest changes, corrections, or add-ons must be submitted at least 30 days prior to arrival.</p>

    <h3>11. Payment Schedule</h3>
    <p>
      Points rented: <b>${Number(summary.pointsRented)}</b><br/>
      Price per point: <b>${money(derivedPricePerPoint)}</b><br/>
      Total rental amount: <b>${money(derivedTotalUsd)}</b><br/>
      Initial payment due immediately upon signing: <b>${money(derivedAmountPaidUsd)}</b><br/>
      Remaining balance due before check-in: <b>${money(derivedBalanceOwedUsd)}</b>
    </p>

    <h3 id="cancellation-policy">12. Deferred Cancellation Credit Policy</h3>
    <p>This reservation may be eligible for Pixie DVC’s Deferred Cancellation Credit Policy, available at https://pixiedvc.com/policies/deferred-cancellation</p>

    <h3>13. Compliance and Damages</h3>
    <p>Renter agrees to comply with all Disney Vacation Club rules and guest conduct requirements. Renter is responsible for any damages, unpaid charges, or assessments billed to the Owner or the Owner’s DVC account and agrees to reimburse such amounts within 60 days of written notice. Collection costs and legal fees may apply.</p>

    <h3>14. Indemnification</h3>
    <p>Renter agrees to indemnify and hold harmless the Owner and Pixie DVC from any claims, losses, damages, costs, or expenses (including legal fees) arising from Renter’s acts or omissions, or those of permitted occupants.</p>

    <h3>15. Governing Law</h3>
    <p>This Agreement shall be governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein. The Parties submit to the non-exclusive jurisdiction of the courts of Ontario.</p>

    <h3>16. Force Majeure</h3>
    <p>Neither Pixie DVC nor the Owner shall be liable for failure to perform due to events beyond reasonable control, including natural disasters, government actions, public health emergencies, or Disney-initiated closures. If Pixie DVC has collected full payment, Pixie DVC may issue a credit equal to the amount paid, subject to its policies.</p>

    <h3>17. Owner Failure to Perform</h3>
    <p>If accommodations are unavailable due to an action or omission of the Owner and comparable accommodations cannot be secured, Renter’s remedy shall be limited to a refund of the amount paid, payable by the Owner. If replacement accommodations cost more, the difference shall be the responsibility of the Owner.</p>

    <h3>18. Housekeeping</h3>
    <p>Disney Vacation Club resorts do not provide daily housekeeping. Trash &amp; Towel and full cleaning services are provided according to Disney’s published schedule.</p>

    <h3>19. Animals and Pet Restrictions</h3>
    <p>Animals are not permitted at Disney Vacation Club resorts. The sole exception is service animals, as defined by the Americans with Disabilities Act (ADA). The only DVC accommodation permitting pets is the Cabins at Disney’s Fort Wilderness Resort, and only in accordance with Disney’s pet policies. Pixie DVC and the Owner assume no responsibility for denial of access, removal of animals, or penalties imposed by Disney. All related costs are the responsibility of the Renter.</p>

    <h3>20. Travel Documentation</h3>
    <p>Renter is solely responsible for obtaining valid passports, visas, and entry documentation. Entry into the United States is not guaranteed.</p>

    <h3>21. Standards Disclaimer</h3>
    <p>Renter acknowledges that standards of accommodation and services may differ from those in Renter’s country of residence.</p>

    <h3>22. Entire Agreement</h3>
    <p>This Agreement constitutes the entire agreement between the Parties and supersedes all prior discussions or representations.</p>

    <h3>23. Electronic Execution</h3>
    <p>This Agreement may be executed electronically and shall be binding upon electronic acceptance or payment.</p>

    <hr style="margin: 18px 0;" />

    <p style="margin-top: 20px;">
      <b>Guest:</b> ${guestSignature}<br/>
      <b>Owner:</b> ${esc(snapshot.parties.owner.fullName)}<br/>
      <b>Second owner:</b> ${esc(snapshot.parties.owner.secondOwnerFullName ?? '—')}<br/>
      <b>Date:</b> ${esc(effectiveDate)}
    </p>

    <div style="margin-top: 18px; font-size: 11px; opacity: 0.9;">
      <b>Pixie DVC</b><br/>
      8 The Green Ste Suite A<br/>
      Dover, DE 19901, USA<br/>
      Pixie DVC a AlphaFlare Company
    </div>
  </div>
  `;
}
