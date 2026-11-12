// Business facts shown on policy pages, the contact hub and the shop.
// Only the studio can confirm these. A null value is displayed as pending
// ("to be confirmed by the studio") and is reported by `npm run launch:check`;
// never replace one with a guess. Decision IDs refer to docs/LAUNCH-PLAN.md §6.
export const BUSINESS = Object.freeze({
  /** D1: registered legal name of the business (e.g. "… Private Limited"). */
  legalName: null,
  /** D1: registered postal address shown to customers. */
  address: null,
  /** D1: GSTIN, only if registered. */
  gstin: null,
  /** D2: { name, designation, email, telephone } of the grievance officer. */
  grievanceOfficer: null,
  /** D14: e.g. "Monday to Saturday, 10 am to 7 pm IST". */
  hours: null,
  /** D14: e.g. "We usually reply on WhatsApp within a few hours." */
  responseTime: null,
  readings: Object.freeze({
    /** D3: how readings are delivered (call, video call, in person, PDF…). */
    delivery: null,
    /** D4: rescheduling and cancellation terms. */
    cancellation: null,
    /** D4: when and how a reading fee is refunded. */
    refunds: null,
    /** D8: accepted payment methods for readings, as arranged by the studio. */
    payment: null,
  }),
  shop: Object.freeze({
    /** D5: where the shop delivers. */
    shippingRegions: null,
    /** D5: dispatch and delivery times. */
    deliveryTimes: null,
    /** D5: shipping charges, or how they are calculated. */
    shippingCharges: null,
    /** D5: return or exchange window in days. */
    returnWindowDays: null,
    /** D5: which items can be returned and in what condition. */
    returnConditions: null,
    /** D5: refund method and timeline. */
    refunds: null,
  }),
  /** Date the policies were approved, as YYYY-MM-DD. */
  policiesEffectiveDate: null,
});

export const PENDING_TEXT = 'To be confirmed by the studio before launch.';

const REQUIRED = [
  ['legalName', 'D1', 'Registered business name'],
  ['address', 'D1', 'Registered address'],
  ['grievanceOfficer', 'D2', 'Grievance officer contact'],
  ['hours', 'D14', 'Business hours'],
  ['readings.delivery', 'D3', 'How readings are delivered'],
  ['readings.cancellation', 'D4', 'Reading cancellation and rescheduling'],
  ['readings.refunds', 'D4', 'Reading refunds'],
  ['readings.payment', 'D8', 'Reading payment methods'],
  ['shop.shippingRegions', 'D5', 'Shipping regions'],
  ['shop.deliveryTimes', 'D5', 'Delivery times'],
  ['shop.shippingCharges', 'D5', 'Shipping charges'],
  ['shop.returnWindowDays', 'D5', 'Return window'],
  ['shop.returnConditions', 'D5', 'Return conditions'],
  ['shop.refunds', 'D5', 'Shop refunds'],
  ['policiesEffectiveDate', 'D1', 'Policy approval date'],
];

function read(path, facts) {
  return path.split('.').reduce((value, key) => value?.[key], facts);
}

/** Facts still missing before the policies can be published as final. */
export function missingBusinessFacts(facts = BUSINESS) {
  return REQUIRED.filter(([path]) => {
    const value = read(path, facts);
    return value === null || value === undefined || value === '';
  }).map(([path, decision, label]) => ({ path, decision, label }));
}

/** Display helper: the confirmed value, or the explicit pending notice. */
export function fact(path, facts = BUSINESS) {
  const value = read(path, facts);
  return value === null || value === undefined || value === '' ? null : value;
}
