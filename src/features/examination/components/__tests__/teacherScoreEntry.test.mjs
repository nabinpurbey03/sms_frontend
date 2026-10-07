import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateStudentResult,
  deriveStudentScore,
  buildStudentScorePayload,
  validateStudentScoreBounds,
} from '../../types.ts';

// ---------------------------------------------------------------------------
// 1. Pass / Fail Evaluation Logic Tests
// ---------------------------------------------------------------------------

test('evaluateStudentResult: Both pass -> Pass', () => {
  const result = evaluateStudentResult({
    hasPractical: true,
    theoryScore: 60,
    isTheoryAbsent: false,
    theoryPassMark: 27,
    practicalScore: 20,
    isPracticalAbsent: false,
    practicalPassMark: 10,
    passMark: 37,
  });

  assert.equal(result.status, 'Pass');
  assert.equal(result.variant, 'success');
  assert.equal(result.isPass, true);
});

test('evaluateStudentResult: High theory, fail practical -> Fail (PR)', () => {
  const result = evaluateStudentResult({
    hasPractical: true,
    theoryScore: 70, // Well above theory pass mark (27)
    isTheoryAbsent: false,
    theoryPassMark: 27,
    practicalScore: 8, // Below practical pass mark (10)
    isPracticalAbsent: false,
    practicalPassMark: 10,
    passMark: 37,
  });

  assert.equal(result.status, 'Fail (PR)');
  assert.equal(result.variant, 'destructive');
  assert.equal(result.isPass, false);
  assert.match(result.tooltip || '', /practical score below pass mark/i);
});

test('evaluateStudentResult: High practical, fail theory -> Fail (TH)', () => {
  const result = evaluateStudentResult({
    hasPractical: true,
    theoryScore: 20, // Below theory pass mark (27)
    isTheoryAbsent: false,
    theoryPassMark: 27,
    practicalScore: 25, // Well above practical pass mark (10)
    isPracticalAbsent: false,
    practicalPassMark: 10,
    passMark: 37,
  });

  assert.equal(result.status, 'Fail (TH)');
  assert.equal(result.variant, 'destructive');
  assert.equal(result.isPass, false);
  assert.match(result.tooltip || '', /theory score below pass mark/i);
});

test('evaluateStudentResult: Fail both -> Fail', () => {
  const result = evaluateStudentResult({
    hasPractical: true,
    theoryScore: 15, // Below 27
    isTheoryAbsent: false,
    theoryPassMark: 27,
    practicalScore: 5, // Below 10
    isPracticalAbsent: false,
    practicalPassMark: 10,
    passMark: 37,
  });

  assert.equal(result.status, 'Fail');
  assert.equal(result.variant, 'destructive');
  assert.equal(result.isPass, false);
});

test('evaluateStudentResult: Component absenteeism -> TH Absent / PR Absent / Absent', () => {
  // 1. Theory absent only in dual component
  const thAbsentResult = evaluateStudentResult({
    hasPractical: true,
    theoryScore: 0,
    isTheoryAbsent: true,
    theoryPassMark: 27,
    practicalScore: 20,
    isPracticalAbsent: false,
    practicalPassMark: 10,
  });
  assert.equal(thAbsentResult.status, 'TH Absent');
  assert.equal(thAbsentResult.variant, 'destructive');
  assert.equal(thAbsentResult.isPass, false);

  // 2. Practical absent only in dual component
  const prAbsentResult = evaluateStudentResult({
    hasPractical: true,
    theoryScore: 65,
    isTheoryAbsent: false,
    theoryPassMark: 27,
    practicalScore: 0,
    isPracticalAbsent: true,
    practicalPassMark: 10,
  });
  assert.equal(prAbsentResult.status, 'PR Absent');
  assert.equal(prAbsentResult.variant, 'destructive');
  assert.equal(prAbsentResult.isPass, false);

  // 3. Both absent in dual component
  const bothAbsentResult = evaluateStudentResult({
    hasPractical: true,
    theoryScore: 0,
    isTheoryAbsent: true,
    theoryPassMark: 27,
    practicalScore: 0,
    isPracticalAbsent: true,
    practicalPassMark: 10,
  });
  assert.equal(bothAbsentResult.status, 'Absent (0)');
  assert.equal(bothAbsentResult.variant, 'destructive');
  assert.equal(bothAbsentResult.isPass, false);

  // 4. Single component absent (!hasPractical)
  const singleAbsentResult = evaluateStudentResult({
    hasPractical: false,
    theoryScore: 0,
    isTheoryAbsent: true,
    theoryPassMark: 40,
    practicalScore: null,
    isPracticalAbsent: false,
    practicalPassMark: 0,
    passMark: 40,
  });
  assert.equal(singleAbsentResult.status, 'Absent');
  assert.equal(singleAbsentResult.variant, 'destructive');
  assert.equal(singleAbsentResult.isPass, false);
});

test('evaluateStudentResult: Pending state for missing scores', () => {
  // Dual component: Missing practical
  const missingPr = evaluateStudentResult({
    hasPractical: true,
    theoryScore: 60,
    isTheoryAbsent: false,
    theoryPassMark: 27,
    practicalScore: null,
    isPracticalAbsent: false,
    practicalPassMark: 10,
  });
  assert.equal(missingPr.status, 'Pending');
  assert.equal(missingPr.variant, 'secondary');

  // Dual component: Missing theory
  const missingTh = evaluateStudentResult({
    hasPractical: true,
    theoryScore: null,
    isTheoryAbsent: false,
    theoryPassMark: 27,
    practicalScore: 20,
    isPracticalAbsent: false,
    practicalPassMark: 10,
  });
  assert.equal(missingTh.status, 'Pending');
  assert.equal(missingTh.variant, 'secondary');

  // Single component: Missing score
  const missingSingle = evaluateStudentResult({
    hasPractical: false,
    theoryScore: null,
    isTheoryAbsent: false,
    theoryPassMark: 40,
    practicalScore: null,
    isPracticalAbsent: false,
    practicalPassMark: 0,
    passMark: 40,
  });
  assert.equal(missingSingle.status, 'Pending');
  assert.equal(missingSingle.variant, 'secondary');
});

// ---------------------------------------------------------------------------
// 2. Live Total Score Derivation Tests
// ---------------------------------------------------------------------------

test('deriveStudentScore: correctly derives total score for dual component', () => {
  // Both present
  const totalBoth = deriveStudentScore(
    {
      theoryScore: 55,
      isTheoryAbsent: false,
      practicalScore: 22,
      isPracticalAbsent: false,
    },
    true
  );
  assert.equal(totalBoth, 77);

  // Decimal scores
  const totalDecimals = deriveStudentScore(
    {
      theoryScore: 48.5,
      isTheoryAbsent: false,
      practicalScore: 19.5,
      isPracticalAbsent: false,
    },
    true
  );
  assert.equal(totalDecimals, 68);

  // Theory absent + practical present
  const totalThAbsent = deriveStudentScore(
    {
      theoryScore: null,
      isTheoryAbsent: true,
      practicalScore: 23,
      isPracticalAbsent: false,
    },
    true
  );
  assert.equal(totalThAbsent, 23);

  // Practical absent + theory present
  const totalPrAbsent = deriveStudentScore(
    {
      theoryScore: 62,
      isTheoryAbsent: false,
      practicalScore: null,
      isPracticalAbsent: true,
    },
    true
  );
  assert.equal(totalPrAbsent, 62);

  // Both absent
  const totalBothAbsent = deriveStudentScore(
    {
      theoryScore: null,
      isTheoryAbsent: true,
      practicalScore: null,
      isPracticalAbsent: true,
    },
    true
  );
  assert.equal(totalBothAbsent, 0);

  // Neither entered yet
  const totalUnentered = deriveStudentScore(
    {
      theoryScore: null,
      isTheoryAbsent: false,
      practicalScore: null,
      isPracticalAbsent: false,
    },
    true
  );
  assert.equal(totalUnentered, null);
});

test('deriveStudentScore: correctly derives score when hasPractical is false', () => {
  const scorePresent = deriveStudentScore(
    {
      theoryScore: 85,
      isTheoryAbsent: false,
      practicalScore: null,
      isPracticalAbsent: false,
    },
    false
  );
  assert.equal(scorePresent, 85);

  const scoreAbsent = deriveStudentScore(
    {
      theoryScore: null,
      isTheoryAbsent: true,
      practicalScore: null,
      isPracticalAbsent: false,
    },
    false
  );
  assert.equal(scoreAbsent, 0);

  const scorePending = deriveStudentScore(
    {
      theoryScore: null,
      isTheoryAbsent: false,
      practicalScore: null,
      isPracticalAbsent: false,
    },
    false
  );
  assert.equal(scorePending, null);
});

// ---------------------------------------------------------------------------
// 3. Payload Construction for bulk_upsert_scores Tests
// ---------------------------------------------------------------------------

test('buildStudentScorePayload: maps dual component present student correctly', () => {
  const row = {
    studentId: 'st-001',
    studentName: 'Aarav Sharma',
    theoryScore: 65,
    isTheoryAbsent: false,
    practicalScore: 24,
    isPracticalAbsent: false,
    score: 89,
    isAbsent: false,
  };

  const payload = buildStudentScorePayload(row, true);
  assert.deepEqual(payload, {
    student_id: 'st-001',
    theory_score: 65,
    is_theory_absent: false,
    practical_score: 24,
    is_practical_absent: false,
    score: 89,
    is_absent: false,
  });
});

test('buildStudentScorePayload: maps theory absent student (has practical)', () => {
  const row = {
    studentId: 'st-002',
    studentName: 'Bibek Thapa',
    theoryScore: 50, // Should be normalized to 0 because isTheoryAbsent is true
    isTheoryAbsent: true,
    practicalScore: 20,
    isPracticalAbsent: false,
    score: 20,
    isAbsent: false,
  };

  const payload = buildStudentScorePayload(row, true);
  assert.deepEqual(payload, {
    student_id: 'st-002',
    theory_score: 0,
    is_theory_absent: true,
    practical_score: 20,
    is_practical_absent: false,
    score: 20,
    is_absent: false,
  });
});

test('buildStudentScorePayload: maps practical absent student (has practical)', () => {
  const row = {
    studentId: 'st-003',
    studentName: 'Chhiring Sherpa',
    theoryScore: 70,
    isTheoryAbsent: false,
    practicalScore: 25, // Should be normalized to 0 because isPracticalAbsent is true
    isPracticalAbsent: true,
    score: 70,
    isAbsent: false,
  };

  const payload = buildStudentScorePayload(row, true);
  assert.deepEqual(payload, {
    student_id: 'st-003',
    theory_score: 70,
    is_theory_absent: false,
    practical_score: 0,
    is_practical_absent: true,
    score: 70,
    is_absent: false,
  });
});

test('buildStudentScorePayload: maps both absent student (has practical)', () => {
  const row = {
    studentId: 'st-004',
    studentName: 'Dipesh Shrestha',
    theoryScore: null,
    isTheoryAbsent: true,
    practicalScore: null,
    isPracticalAbsent: true,
    score: 0,
    isAbsent: true,
  };

  const payload = buildStudentScorePayload(row, true);
  assert.deepEqual(payload, {
    student_id: 'st-004',
    theory_score: 0,
    is_theory_absent: true,
    practical_score: 0,
    is_practical_absent: true,
    score: 0,
    is_absent: true, // Both absent -> true
  });
});

test('buildStudentScorePayload: maps single component (!hasPractical) correctly', () => {
  const rowPresent = {
    studentId: 'st-005',
    studentName: 'Elisha Karki',
    theoryScore: 92,
    isTheoryAbsent: false,
    practicalScore: null,
    isPracticalAbsent: false,
    score: 92,
    isAbsent: false,
  };

  const payloadPresent = buildStudentScorePayload(rowPresent, false);
  assert.deepEqual(payloadPresent, {
    student_id: 'st-005',
    theory_score: 92,
    is_theory_absent: false,
    practical_score: 0,
    is_practical_absent: false,
    score: 92,
    is_absent: false,
  });

  const rowAbsent = {
    studentId: 'st-006',
    studentName: 'Firoz Khan',
    theoryScore: null,
    isTheoryAbsent: true,
    practicalScore: null,
    isPracticalAbsent: false,
    score: 0,
    isAbsent: true,
  };

  const payloadAbsent = buildStudentScorePayload(rowAbsent, false);
  assert.deepEqual(payloadAbsent, {
    student_id: 'st-006',
    theory_score: 0,
    is_theory_absent: true,
    practical_score: 0,
    is_practical_absent: false,
    score: 0,
    is_absent: true,
  });
});

// ---------------------------------------------------------------------------
// 4. Validation of Student Score Bounds Tests
// ---------------------------------------------------------------------------

test('validateStudentScoreBounds: returns undefined for valid bounds', () => {
  const validRow = {
    studentId: 'st-001',
    studentName: 'Aarav Sharma',
    theoryScore: 70,
    isTheoryAbsent: false,
    practicalScore: 20,
    isPracticalAbsent: false,
    score: 90,
    isAbsent: false,
  };

  const err = validateStudentScoreBounds(validRow, {
    hasPractical: true,
    theoryFullMark: 75,
    practicalFullMark: 25,
    fullMark: 100,
  });
  assert.equal(err, undefined);
});

test('validateStudentScoreBounds: returns error when theory exceeds theoryFullMark', () => {
  const row = {
    studentId: 'st-001',
    studentName: 'Aarav Sharma',
    theoryScore: 80,
    isTheoryAbsent: false,
    practicalScore: 20,
    isPracticalAbsent: false,
    score: 100,
    isAbsent: false,
  };

  const err = validateStudentScoreBounds(row, {
    hasPractical: true,
    theoryFullMark: 75,
    practicalFullMark: 25,
    fullMark: 100,
  });
  assert.match(err || '', /theory score/i);
  assert.match(err || '', /75/);
});

test('validateStudentScoreBounds: returns error when practical exceeds practicalFullMark', () => {
  const row = {
    studentId: 'st-001',
    studentName: 'Aarav Sharma',
    theoryScore: 70,
    isTheoryAbsent: false,
    practicalScore: 28,
    isPracticalAbsent: false,
    score: 98,
    isAbsent: false,
  };

  const err = validateStudentScoreBounds(row, {
    hasPractical: true,
    theoryFullMark: 75,
    practicalFullMark: 25,
    fullMark: 100,
  });
  assert.match(err || '', /practical score/i);
  assert.match(err || '', /25/);
});

test('validateStudentScoreBounds: returns error for negative scores', () => {
  const row = {
    studentId: 'st-001',
    studentName: 'Aarav Sharma',
    theoryScore: -5,
    isTheoryAbsent: false,
    practicalScore: 20,
    isPracticalAbsent: false,
    score: 15,
    isAbsent: false,
  };

  const err = validateStudentScoreBounds(row, {
    hasPractical: true,
    theoryFullMark: 75,
    practicalFullMark: 25,
    fullMark: 100,
  });
  assert.match(err || '', /between 0 and 75/i);
});
