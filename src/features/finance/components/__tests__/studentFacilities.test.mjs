import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEffectiveTransportFee,
  calculateStudentFacilitiesMonthlyTotal,
  calculateStudentConcessionsMonthlyTotal,
  calculateStudentNetMonthlyTotal,
  getFacilityCategoryMeta,
  formatFacilityBadgeLabel,
  getTransportDisplayMeta,
} from '../../utils/studentFacilityUtils.ts';

test('calculateEffectiveTransportFee: returns 0 when transport is disabled or null', () => {
  assert.equal(calculateEffectiveTransportFee(null, 1200), 0);
  assert.equal(calculateEffectiveTransportFee(undefined, 1200), 0);
  assert.equal(calculateEffectiveTransportFee({ is_transport_applicable: false, transport_fee: 1500 }, 1200), 0);
});

test('calculateEffectiveTransportFee: returns custom transport fee when specified and active', () => {
  const profile = { is_transport_applicable: true, transport_fee: 1800 };
  assert.equal(calculateEffectiveTransportFee(profile, 1200), 1800);
});

test('calculateEffectiveTransportFee: falls back to class default rate when custom fee is null/undefined', () => {
  const profileNull = { is_transport_applicable: true, transport_fee: null };
  assert.equal(calculateEffectiveTransportFee(profileNull, 1500), 1500);

  const profileUndefined = { is_transport_applicable: true };
  assert.equal(calculateEffectiveTransportFee(profileUndefined, 2000), 2000);
});

test('calculateStudentFacilitiesMonthlyTotal: sums active monthly fees, ignores one-time and inactive', () => {
  const assignments = [
    { id: '1', fee_category: 'HOSTEL', amount: 5000, frequency: 'MONTHLY', is_active: true },
    { id: '2', fee_category: 'CANTEEN', amount: 3000, frequency: 'MONTHLY', is_active: true },
    { id: '3', fee_category: 'LAB', amount: 1200, frequency: 'ONE_TIME', is_active: true },
    { id: '4', fee_category: 'COACHING', amount: 2000, frequency: 'MONTHLY', is_active: false },
    { id: '5', fee_category: 'SCHOLARSHIP', amount: 1000, frequency: 'MONTHLY', is_active: true },
  ];

  // Only HOSTEL (5000) + CANTEEN (3000) = 8000
  assert.equal(calculateStudentFacilitiesMonthlyTotal(assignments), 8000);
});

test('calculateStudentConcessionsMonthlyTotal: sums active monthly scholarships', () => {
  const assignments = [
    { id: '1', fee_category: 'SCHOLARSHIP', amount: 1500, frequency: 'MONTHLY', is_active: true },
    { id: '2', fee_category: 'SCHOLARSHIP', amount: 500, frequency: 'MONTHLY', is_active: false },
    { id: '3', fee_category: 'HOSTEL', amount: 4000, frequency: 'MONTHLY', is_active: true },
  ];

  assert.equal(calculateStudentConcessionsMonthlyTotal(assignments), 1500);
});

test('calculateStudentNetMonthlyTotal: computes base tuition + transport + facilities - concessions', () => {
  const baseTuition = 2500;
  const transportProfile = { is_transport_applicable: true, transport_fee: 1200 };
  const assignedFees = [
    { fee_category: 'HOSTEL', amount: '4500', frequency: 'MONTHLY', is_active: true },
    { fee_category: 'CANTEEN', amount: 2000, frequency: 'MONTHLY', is_active: true },
    { fee_category: 'SCHOLARSHIP', amount: 1000, frequency: 'MONTHLY', is_active: true },
  ];

  // 2500 + 1200 + (4500 + 2000) - 1000 = 9200
  const total = calculateStudentNetMonthlyTotal({
    baseTuition,
    transportProfile,
    classDefaultTransportRate: 1000,
    assignedFees,
  });

  assert.equal(total, 9200);
});

test('calculateStudentNetMonthlyTotal: handles zero facilities and no transport gracefully', () => {
  const total = calculateStudentNetMonthlyTotal({
    baseTuition: 3000,
    transportProfile: null,
    classDefaultTransportRate: 1500,
    assignedFees: [],
  });

  assert.equal(total, 3000);
});

test('getFacilityCategoryMeta: maps categories to appropriate labels and color tokens', () => {
  const transportMeta = getFacilityCategoryMeta('TRANSPORT');
  assert.equal(transportMeta.label, 'Bus');
  assert.match(transportMeta.colorClass, /blue/);

  const hostelMeta = getFacilityCategoryMeta('HOSTEL');
  assert.equal(hostelMeta.label, 'Hostel');
  assert.match(hostelMeta.colorClass, /purple/);

  const canteenMeta = getFacilityCategoryMeta('CANTEEN');
  assert.equal(canteenMeta.label, 'Canteen');
  assert.match(canteenMeta.colorClass, /amber/);

  const coachingMeta = getFacilityCategoryMeta('COACHING');
  assert.equal(coachingMeta.label, 'Coaching');

  const labMeta = getFacilityCategoryMeta('LAB');
  assert.equal(labMeta.label, 'Lab');

  const unknownMeta = getFacilityCategoryMeta('SOMETHING_ELSE');
  assert.equal(unknownMeta.label, 'Facility');
});

test('formatFacilityBadgeLabel: formats labels according to spec with NPR amounts', () => {
  assert.equal(formatFacilityBadgeLabel('TRANSPORT', 'School Bus', 1200), 'Bus (NPR 1,200)');
  assert.equal(formatFacilityBadgeLabel('HOSTEL', 'Boys Hostel', 4500), 'Hostel (NPR 4,500)');
  assert.equal(formatFacilityBadgeLabel('CANTEEN', 'Lunch Plan', 2000), 'Canteen (NPR 2,000)');
  assert.equal(formatFacilityBadgeLabel('COACHING', 'Math Clinic', 1500), 'Coaching (NPR 1,500)');
  assert.equal(formatFacilityBadgeLabel('LAB', 'Physics Lab', 800), 'Lab (NPR 800)');
});

test('getTransportDisplayMeta: returns unenrolled meta when transport is disabled or null', () => {
  const metaNull = getTransportDisplayMeta(null, 1500);
  assert.equal(metaNull.isEnrolled, false);
  assert.equal(metaNull.monthlyFee, 0);
  assert.equal(metaNull.isCustomRate, false);
  assert.equal(metaNull.rateBadgeLabel, 'Not Enrolled');
  assert.equal(metaNull.routeDescription, 'No bus facility requested');

  const metaUndefined = getTransportDisplayMeta(undefined, 1500);
  assert.equal(metaUndefined.isEnrolled, false);
  assert.equal(metaUndefined.monthlyFee, 0);
  assert.equal(metaUndefined.isCustomRate, false);
  assert.equal(metaUndefined.rateBadgeLabel, 'Not Enrolled');
  assert.equal(metaUndefined.routeDescription, 'No bus facility requested');

  const metaDisabled = getTransportDisplayMeta({ is_transport_applicable: false, transport_fee: 1500, reason: 'Route 1' }, 1500);
  assert.equal(metaDisabled.isEnrolled, false);
  assert.equal(metaDisabled.monthlyFee, 0);
  assert.equal(metaDisabled.isCustomRate, false);
  assert.equal(metaDisabled.rateBadgeLabel, 'Not Enrolled');
  assert.equal(metaDisabled.routeDescription, 'No bus facility requested');
});

test('getTransportDisplayMeta: returns class standard rate details when custom fee is not set', () => {
  const meta = getTransportDisplayMeta(
    { is_transport_applicable: true, transport_fee: null, reason: 'Route 2, Bus Stop' },
    1200
  );
  assert.equal(meta.isEnrolled, true);
  assert.equal(meta.monthlyFee, 1200);
  assert.equal(meta.isCustomRate, false);
  assert.equal(meta.rateBadgeLabel, 'Class Standard');
  assert.equal(meta.routeDescription, 'Route 2, Bus Stop');

  const metaUndefinedFee = getTransportDisplayMeta(
    { is_transport_applicable: true, transport_fee: undefined },
    1500
  );
  assert.equal(metaUndefinedFee.isEnrolled, true);
  assert.equal(metaUndefinedFee.monthlyFee, 1500);
  assert.equal(metaUndefinedFee.isCustomRate, false);
  assert.equal(metaUndefinedFee.rateBadgeLabel, 'Class Standard');

  const metaDefaultRateFallback = getTransportDisplayMeta(
    { is_transport_applicable: true }
  );
  assert.equal(metaDefaultRateFallback.isEnrolled, true);
  assert.equal(metaDefaultRateFallback.monthlyFee, 0);
  assert.equal(metaDefaultRateFallback.isCustomRate, false);
  assert.equal(metaDefaultRateFallback.rateBadgeLabel, 'Class Standard');
});

test('getTransportDisplayMeta: returns custom route rate details when custom fee is specified', () => {
  const meta = getTransportDisplayMeta(
    { is_transport_applicable: true, transport_fee: 1800, reason: 'Stop A' },
    1200
  );
  assert.equal(meta.isEnrolled, true);
  assert.equal(meta.monthlyFee, 1800);
  assert.equal(meta.isCustomRate, true);
  assert.equal(meta.rateBadgeLabel, 'Custom Rate');
  assert.equal(meta.routeDescription, 'Stop A');
});

test('getTransportDisplayMeta: sets isCustomRate to false when custom fee equals default rate', () => {
  const meta = getTransportDisplayMeta(
    { is_transport_applicable: true, transport_fee: 1200, reason: 'Stop B' },
    1200
  );
  assert.equal(meta.isEnrolled, true);
  assert.equal(meta.monthlyFee, 1200);
  assert.equal(meta.isCustomRate, false);
  assert.equal(meta.rateBadgeLabel, 'Class Standard');
  assert.equal(meta.routeDescription, 'Stop B');
});

test('getTransportDisplayMeta: falls back to default route description when reason is empty or whitespace', () => {
  const metaEmpty = getTransportDisplayMeta(
    { is_transport_applicable: true, transport_fee: 1000, reason: '' },
    1000
  );
  assert.equal(metaEmpty.routeDescription, 'Standard school bus route');

  const metaWhitespace = getTransportDisplayMeta(
    { is_transport_applicable: true, transport_fee: 1000, reason: '   ' },
    1000
  );
  assert.equal(metaWhitespace.routeDescription, 'Standard school bus route');

  const metaNullReason = getTransportDisplayMeta(
    { is_transport_applicable: true, transport_fee: 1000, reason: null },
    1000
  );
  assert.equal(metaNullReason.routeDescription, 'Standard school bus route');

  const metaTrimmed = getTransportDisplayMeta(
    { is_transport_applicable: true, transport_fee: 1000, reason: '  Main Gate Stop  ' },
    1000
  );
  assert.equal(metaTrimmed.routeDescription, 'Main Gate Stop');
});

