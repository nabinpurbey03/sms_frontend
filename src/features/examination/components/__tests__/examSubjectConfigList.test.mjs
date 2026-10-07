import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXAM_MARK_PRESETS,
  deriveTotalMarks,
  validateSubjectMarks,
  applyPresetToSubject,
  MARK_INPUT_CLASS,
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

// ---------------------------------------------------------------------------
// 4. Mark Input Sizing & Ergonomic Class Tests
// ---------------------------------------------------------------------------

test('MARK_INPUT_CLASS: includes spin-button suppression, typography, and width sizing', () => {
  assert.ok(typeof MARK_INPUT_CLASS === 'string', 'MARK_INPUT_CLASS should be a string');
  assert.match(MARK_INPUT_CLASS, /w-14/, 'Must define mobile base width w-14');
  assert.match(MARK_INPUT_CLASS, /sm:w-16/, 'Must define responsive width sm:w-16');
  assert.match(MARK_INPUT_CLASS, /\[appearance:textfield\]/, 'Must suppress browser steppers on Firefox');
  assert.match(MARK_INPUT_CLASS, /\[&::-webkit-inner-spin-button\]:appearance-none/, 'Must suppress inner stepper spin button on WebKit');
  assert.match(MARK_INPUT_CLASS, /\[&::-webkit-outer-spin-button\]:appearance-none/, 'Must suppress outer stepper spin button on WebKit');
  assert.match(MARK_INPUT_CLASS, /font-mono/, 'Must use monospace font for uniform digit alignment');
  assert.match(MARK_INPUT_CLASS, /text-center/, 'Must center text for compact numerical readability');
});

test('preset values fit comfortably within 3-digit mark constraints', () => {
  const valuesToCheck = [100, 75, 27, 25, 10, 0];
  for (const val of valuesToCheck) {
    const str = String(val);
    assert.ok(str.length >= 1 && str.length <= 3, `Value ${val} string length (${str.length}) must be between 1 and 3 digits`);
  }

  // Also verify all predefined presets have values that fit within 3 digits
  Object.values(EXAM_MARK_PRESETS).forEach((preset) => {
    const fields = [
      preset.theoryFullMark,
      preset.theoryPassMark,
      preset.practicalFullMark,
      preset.practicalPassMark,
    ];
    for (const val of fields) {
      const str = String(val);
      assert.ok(str.length <= 3, `Preset ${preset.label} field value ${val} must fit within 3 digits`);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. ExamSubjectConfigList Component Layout & Modernization Tests
// ---------------------------------------------------------------------------

test('ExamSubjectConfigList source imports MARK_INPUT_CLASS from ../types', () => {
  const filePath = path.resolve(import.meta.dirname, '../ExamSubjectConfigList.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');
  assert.match(source, /import\s*\{[^}]*MARK_INPUT_CLASS[^}]*\}\s*from\s*['"]\.\.\/types['"]/);
});

test('ExamSubjectConfigList desktop table has overflow-x-auto and min-w-[880px]', () => {
  const filePath = path.resolve(import.meta.dirname, '../ExamSubjectConfigList.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /Table\s+className=["'][^"']*min-w-\[880px\][^"']*["']/);
});

test('ExamSubjectConfigList desktop table defines specified column proportions', () => {
  const filePath = path.resolve(import.meta.dirname, '../ExamSubjectConfigList.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');
  assert.match(source, /TableHead[^>]*w-\[80px\][^>]*text-center/);
  assert.match(source, /TableHead[^>]*min-w-\[220px\]/);
  assert.match(source, /TableHead[^>]*w-\[170px\]/);
  assert.match(source, /TableHead[^>]*w-\[110px\][^>]*text-center/);
  assert.match(source, /TableHead[^>]*min-w-\[200px\]/);
});

test('ExamSubjectConfigList uses MARK_INPUT_CLASS on numeric inputs', () => {
  const filePath = path.resolve(import.meta.dirname, '../ExamSubjectConfigList.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');
  const count = (source.match(/MARK_INPUT_CLASS/g) || []).length;
  // Should appear in import + at least 4 inputs in desktop table
  assert.ok(count >= 5, `Expected at least 5 occurrences of MARK_INPUT_CLASS, found ${count}`);
});

test('ExamSubjectConfigList displays — Theory Only — button when practical is disabled', () => {
  const filePath = path.resolve(import.meta.dirname, '../ExamSubjectConfigList.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');
  assert.match(source, /— Theory Only —/);
});

test('ExamSubjectConfigList mobile card view uses h-10 touch targets and centered monospace inputs', () => {
  const filePath = path.resolve(import.meta.dirname, '../ExamSubjectConfigList.tsx');
  const source = fs.readFileSync(filePath, 'utf-8');
  assert.match(source, /md:hidden/);
  assert.match(source, /h-10[^'"]*font-mono[^'"]*text-center/);
});

