import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXAM_MARK_PRESETS,
  deriveTotalMarks,
  validateSubjectMarks,
  applyPresetToSubject,
} from '../../types.ts';

// ---------------------------------------------------------------------------
// 1. Exam Mark Presets Logic Tests
// ---------------------------------------------------------------------------

test('presets calculation: 75/25 preset values and derivation', () => {
  const preset = EXAM_MARK_PRESETS['75_25'];
  assert.ok(preset, '75/25 preset must exist');
  assert.equal(preset.label, '75/25');
  assert.equal(preset.hasPractical, true);
  assert.equal(preset.theoryFullMark, 75);
  assert.equal(preset.theoryPassMark, 27);
  assert.equal(preset.practicalFullMark, 25);
  assert.equal(preset.practicalPassMark, 10);

  const derived = deriveTotalMarks(preset);
  assert.equal(derived.fullMark, 100);
  assert.equal(derived.passMark, 37);
});

test('presets calculation: 80/20 preset values and derivation', () => {
  const preset = EXAM_MARK_PRESETS['80_20'];
  assert.ok(preset, '80/20 preset must exist');
  assert.equal(preset.label, '80/20');
  assert.equal(preset.hasPractical, true);
  assert.equal(preset.theoryFullMark, 80);
  assert.equal(preset.theoryPassMark, 32);
  assert.equal(preset.practicalFullMark, 20);
  assert.equal(preset.practicalPassMark, 8);

  const derived = deriveTotalMarks(preset);
  assert.equal(derived.fullMark, 100);
  assert.equal(derived.passMark, 40);
});

test('presets calculation: 50/50 preset values and derivation', () => {
  const preset = EXAM_MARK_PRESETS['50_50'];
  assert.ok(preset, '50/50 preset must exist');
  assert.equal(preset.label, '50/50');
  assert.equal(preset.hasPractical, true);
  assert.equal(preset.theoryFullMark, 50);
  assert.equal(preset.theoryPassMark, 20);
  assert.equal(preset.practicalFullMark, 50);
  assert.equal(preset.practicalPassMark, 20);

  const derived = deriveTotalMarks(preset);
  assert.equal(derived.fullMark, 100);
  assert.equal(derived.passMark, 40);
});

test('presets calculation: 100 TH preset values and derivation', () => {
  const preset = EXAM_MARK_PRESETS['100_TH'];
  assert.ok(preset, '100 TH preset must exist');
  assert.equal(preset.label, '100 TH');
  assert.equal(preset.hasPractical, false);
  assert.equal(preset.theoryFullMark, 100);
  assert.equal(preset.theoryPassMark, 40);
  assert.equal(preset.practicalFullMark, 0);
  assert.equal(preset.practicalPassMark, 0);

  const derived = deriveTotalMarks(preset);
  assert.equal(derived.fullMark, 100);
  assert.equal(derived.passMark, 40);
});

test('applyPresetToSubject: applies preset configuration and clears prior errors', () => {
  const subject = {
    subjectId: 'sub-1',
    subjectName: 'Computer Science',
    subjectCode: 'CS101',
    included: true,
    hasPractical: false,
    theoryFullMark: 100,
    theoryPassMark: 120, // invalid mark
    practicalFullMark: 0,
    practicalPassMark: 0,
    fullMark: 100,
    passMark: 120,
    assignedTeacherId: 'teacher-1',
    error: 'Theory pass mark cannot exceed full mark',
  };

  const updated75 = applyPresetToSubject(subject, '75_25');
  assert.equal(updated75.hasPractical, true);
  assert.equal(updated75.theoryFullMark, 75);
  assert.equal(updated75.theoryPassMark, 27);
  assert.equal(updated75.practicalFullMark, 25);
  assert.equal(updated75.practicalPassMark, 10);
  assert.equal(updated75.fullMark, 100);
  assert.equal(updated75.passMark, 37);
  assert.equal(updated75.error, undefined);

  const updated100 = applyPresetToSubject(updated75, '100_TH');
  assert.equal(updated100.hasPractical, false);
  assert.equal(updated100.theoryFullMark, 100);
  assert.equal(updated100.theoryPassMark, 40);
  assert.equal(updated100.practicalFullMark, 0);
  assert.equal(updated100.practicalPassMark, 0);
  assert.equal(updated100.fullMark, 100);
  assert.equal(updated100.passMark, 40);
  assert.equal(updated100.error, undefined);
});

// ---------------------------------------------------------------------------
// 2. Mark Summation & Component Derivation Logic Tests
// ---------------------------------------------------------------------------

test('deriveTotalMarks: sums theory and practical when hasPractical is true', () => {
  const custom = {
    hasPractical: true,
    theoryFullMark: 60,
    theoryPassMark: 24,
    practicalFullMark: 40,
    practicalPassMark: 16,
  };
  const { fullMark, passMark } = deriveTotalMarks(custom);
  assert.equal(fullMark, 100);
  assert.equal(passMark, 40);
});

test('deriveTotalMarks: ignores practical marks when hasPractical is false', () => {
  const theoryOnly = {
    hasPractical: false,
    theoryFullMark: 50,
    theoryPassMark: 20,
    practicalFullMark: 25, // Residual practical value
    practicalPassMark: 10,
  };
  const { fullMark, passMark } = deriveTotalMarks(theoryOnly);
  assert.equal(fullMark, 50);
  assert.equal(passMark, 20);
});

// ---------------------------------------------------------------------------
// 3. Validation Logic Tests
// ---------------------------------------------------------------------------

test('validateSubjectMarks: excluded subjects return no error', () => {
  const result = validateSubjectMarks({
    included: false,
    hasPractical: true,
    theoryFullMark: 0,
    theoryPassMark: 100,
    practicalFullMark: 0,
    practicalPassMark: 50,
  });
  assert.equal(result, undefined);
});

test('validateSubjectMarks: valid configuration returns no error', () => {
  const resultTh = validateSubjectMarks({
    included: true,
    hasPractical: false,
    theoryFullMark: 100,
    theoryPassMark: 40,
    practicalFullMark: 0,
    practicalPassMark: 0,
  });
  assert.equal(resultTh, undefined);

  const resultPr = validateSubjectMarks({
    included: true,
    hasPractical: true,
    theoryFullMark: 75,
    theoryPassMark: 27,
    practicalFullMark: 25,
    practicalPassMark: 10,
  });
  assert.equal(resultPr, undefined);
});

test('validateSubjectMarks: theory pass mark exceeding theory full mark returns error', () => {
  const result = validateSubjectMarks({
    included: true,
    hasPractical: false,
    theoryFullMark: 75,
    theoryPassMark: 80,
    practicalFullMark: 0,
    practicalPassMark: 0,
  });
  assert.equal(result, 'Theory pass mark cannot exceed full mark');
});

test('validateSubjectMarks: practical pass mark exceeding practical full mark returns error', () => {
  const result = validateSubjectMarks({
    included: true,
    hasPractical: true,
    theoryFullMark: 75,
    theoryPassMark: 27,
    practicalFullMark: 25,
    practicalPassMark: 30,
  });
  assert.equal(result, 'Practical pass mark cannot exceed full mark');
});

test('validateSubjectMarks: theory full mark less than 1 returns error', () => {
  const result = validateSubjectMarks({
    included: true,
    hasPractical: false,
    theoryFullMark: 0,
    theoryPassMark: 0,
    practicalFullMark: 0,
    practicalPassMark: 0,
  });
  assert.equal(result, 'Theory full mark must be at least 1');
});

test('validateSubjectMarks: practical full mark less than 1 when practical is enabled returns error', () => {
  const result = validateSubjectMarks({
    included: true,
    hasPractical: true,
    theoryFullMark: 75,
    theoryPassMark: 27,
    practicalFullMark: 0,
    practicalPassMark: 0,
  });
  assert.equal(result, 'Practical full mark must be at least 1');
});

test('validateSubjectMarks: practical marks are not validated when hasPractical is false', () => {
  const result = validateSubjectMarks({
    included: true,
    hasPractical: false,
    theoryFullMark: 100,
    theoryPassMark: 40,
    practicalFullMark: 0,
    practicalPassMark: 50, // residual value would be invalid if practical was active
  });
  assert.equal(result, undefined);
});
