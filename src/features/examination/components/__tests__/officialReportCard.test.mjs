import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Formatting helper for Theory marks in official report card.
 */
export function formatTheoryMarks(sub) {
  const full =
    sub.theory_full_mark != null && sub.theory_full_mark > 0
      ? sub.theory_full_mark
      : sub.full_mark;
  const pass =
    sub.theory_pass_mark != null && sub.theory_pass_mark > 0
      ? sub.theory_pass_mark
      : sub.pass_mark;

  let obtained = '-';
  let isAbsent = false;

  if (sub.is_theory_absent) {
    obtained = '0.00 (AB)';
    isAbsent = true;
  } else if (sub.theory_score !== null && sub.theory_score !== undefined) {
    obtained = Number(sub.theory_score).toFixed(2);
  } else if (sub.score !== null && sub.score !== undefined && !sub.has_practical) {
    obtained = Number(sub.score).toFixed(2);
  }

  return {
    full: String(full),
    pass: String(pass),
    obtained,
    isAbsent,
  };
}

/**
 * Formatting helper for Practical marks in official report card.
 * When sub.has_practical is false/falsy, returns clean em-dashes ('—').
 */
export function formatPracticalMarks(sub) {
  if (!sub.has_practical) {
    return {
      hasPractical: false,
      full: '—',
      pass: '—',
      obtained: '—',
      isAbsent: false,
    };
  }

  const full = sub.practical_full_mark ?? 0;
  const pass = sub.practical_pass_mark ?? 0;

  let obtained = '-';
  let isAbsent = false;

  if (sub.is_practical_absent) {
    obtained = '0.00 (AB)';
    isAbsent = true;
  } else if (sub.practical_score !== null && sub.practical_score !== undefined) {
    obtained = Number(sub.practical_score).toFixed(2);
  }

  return {
    hasPractical: true,
    full: String(full),
    pass: String(pass),
    obtained,
    isAbsent,
  };
}

/**
 * Formatting helper for Total marks column in official report card.
 */
export function formatTotalMarks(sub) {
  let obtained = '-';
  let isAbsent = false;

  if (sub.is_absent) {
    obtained = '0.00 (AB)';
    isAbsent = true;
  } else if (sub.score !== null && sub.score !== undefined) {
    obtained = Number(sub.score).toFixed(2);
  }

  return {
    full: String(sub.full_mark),
    obtained,
    isAbsent,
  };
}

/**
 * Derives aggregate totals for the table footer (tfoot).
 */
export function calculateReportCardTotals(subjects = [], summary = {}) {
  let theoryFull = 0;
  let theoryObtained = 0;
  let practicalFull = 0;
  let practicalObtained = 0;
  let hasAnyPractical = false;

  for (const s of subjects) {
    const sHasPr = Boolean(s.has_practical);
    if (sHasPr) {
      hasAnyPractical = true;
      practicalFull += Number(s.practical_full_mark || 0);
      if (!s.is_practical_absent && s.practical_score !== null && s.practical_score !== undefined) {
        practicalObtained += Number(s.practical_score);
      }
    }

    const tf =
      s.theory_full_mark != null && s.theory_full_mark > 0
        ? s.theory_full_mark
        : s.full_mark;
    theoryFull += Number(tf || 0);

    if (!s.is_theory_absent) {
      if (s.theory_score !== null && s.theory_score !== undefined) {
        theoryObtained += Number(s.theory_score);
      } else if (!sHasPr && s.score !== null && s.score !== undefined) {
        theoryObtained += Number(s.score);
      }
    }
  }

  return {
    theoryFull,
    theoryPass: '-',
    theoryObtained: Number(theoryObtained.toFixed(2)),
    practicalFull,
    practicalPass: '-',
    practicalObtained: Number(practicalObtained.toFixed(2)),
    hasAnyPractical,
    totalFull: Number(summary?.total_full_mark ?? 0),
    totalObtained: Number(summary?.total_obtained ?? 0),
  };
}

// ============================================================================
// TESTS
// ============================================================================

test('formatPracticalMarks: renders clean em-dash (—) when has_practical is false or omitted', () => {
  // Explicit has_practical: false
  const res1 = formatPracticalMarks({
    has_practical: false,
    practical_full_mark: 0,
    practical_pass_mark: 0,
    practical_score: null,
  });
  assert.equal(res1.hasPractical, false);
  assert.equal(res1.full, '—');
  assert.equal(res1.pass, '—');
  assert.equal(res1.obtained, '—');
  assert.equal(res1.isAbsent, false);

  // Omitted has_practical
  const res2 = formatPracticalMarks({
    full_mark: 100,
    pass_mark: 40,
  });
  assert.equal(res2.hasPractical, false);
  assert.equal(res2.full, '—');
  assert.equal(res2.pass, '—');
  assert.equal(res2.obtained, '—');
});

test('formatPracticalMarks: renders practical marks when has_practical is true', () => {
  const res = formatPracticalMarks({
    has_practical: true,
    practical_full_mark: 25,
    practical_pass_mark: 10,
    practical_score: 22.5,
    is_practical_absent: false,
  });
  assert.equal(res.hasPractical, true);
  assert.equal(res.full, '25');
  assert.equal(res.pass, '10');
  assert.equal(res.obtained, '22.50');
  assert.equal(res.isAbsent, false);
});

test('formatPracticalMarks: renders 0.00 (AB) when is_practical_absent is true', () => {
  const res = formatPracticalMarks({
    has_practical: true,
    practical_full_mark: 25,
    practical_pass_mark: 10,
    practical_score: 0,
    is_practical_absent: true,
  });
  assert.equal(res.hasPractical, true);
  assert.equal(res.obtained, '0.00 (AB)');
  assert.equal(res.isAbsent, true);
});

test('formatPracticalMarks: renders dash (-) when score is unentered / null', () => {
  const res = formatPracticalMarks({
    has_practical: true,
    practical_full_mark: 20,
    practical_pass_mark: 8,
    practical_score: null,
    is_practical_absent: false,
  });
  assert.equal(res.hasPractical, true);
  assert.equal(res.obtained, '-');
  assert.equal(res.isAbsent, false);
});

test('formatTheoryMarks: renders theory full/pass/obt for dual component subject', () => {
  const res = formatTheoryMarks({
    has_practical: true,
    theory_full_mark: 75,
    theory_pass_mark: 27,
    theory_score: 64.0,
    full_mark: 100,
    pass_mark: 37,
  });
  assert.equal(res.full, '75');
  assert.equal(res.pass, '27');
  assert.equal(res.obtained, '64.00');
  assert.equal(res.isAbsent, false);
});

test('formatTheoryMarks: falls back to full_mark/pass_mark/score when single component (!has_practical)', () => {
  const res = formatTheoryMarks({
    has_practical: false,
    full_mark: 100,
    pass_mark: 40,
    score: 85.5,
  });
  assert.equal(res.full, '100');
  assert.equal(res.pass, '40');
  assert.equal(res.obtained, '85.50');
  assert.equal(res.isAbsent, false);
});

test('formatTheoryMarks: renders 0.00 (AB) when is_theory_absent is true', () => {
  const res = formatTheoryMarks({
    has_practical: true,
    theory_full_mark: 75,
    theory_pass_mark: 27,
    theory_score: 0,
    is_theory_absent: true,
    full_mark: 100,
    pass_mark: 37,
  });
  assert.equal(res.obtained, '0.00 (AB)');
  assert.equal(res.isAbsent, true);
});

test('formatTheoryMarks: renders dash (-) when theory score is pending', () => {
  const res = formatTheoryMarks({
    has_practical: true,
    theory_full_mark: 75,
    theory_pass_mark: 27,
    theory_score: null,
    full_mark: 100,
    pass_mark: 37,
  });
  assert.equal(res.obtained, '-');
});

test('formatTotalMarks: renders total full and obtained scores or 0.00 (AB) when absent', () => {
  const present = formatTotalMarks({
    full_mark: 100,
    score: 86.5,
    is_absent: false,
  });
  assert.equal(present.full, '100');
  assert.equal(present.obtained, '86.50');
  assert.equal(present.isAbsent, false);

  const absent = formatTotalMarks({
    full_mark: 100,
    score: 0,
    is_absent: true,
  });
  assert.equal(absent.full, '100');
  assert.equal(absent.obtained, '0.00 (AB)');
  assert.equal(absent.isAbsent, true);

  const pending = formatTotalMarks({
    full_mark: 100,
    score: null,
    is_absent: false,
  });
  assert.equal(pending.full, '100');
  assert.equal(pending.obtained, '-');
});

test('calculateReportCardTotals: computes accurate grand totals across mixed practical and non-practical curriculum', () => {
  const subjects = [
    {
      subject_name: 'Nepali',
      has_practical: false,
      theory_full_mark: 100,
      theory_pass_mark: 40,
      score: 75,
      full_mark: 100,
      pass_mark: 40,
    },
    {
      subject_name: 'English',
      has_practical: true,
      theory_full_mark: 75,
      theory_pass_mark: 27,
      theory_score: 55,
      practical_full_mark: 25,
      practical_pass_mark: 10,
      practical_score: 22,
      score: 77,
      full_mark: 100,
      pass_mark: 37,
    },
    {
      subject_name: 'Science',
      has_practical: true,
      theory_full_mark: 75,
      theory_pass_mark: 27,
      theory_score: 0,
      is_theory_absent: true,
      practical_full_mark: 25,
      practical_pass_mark: 10,
      practical_score: 20,
      score: 20,
      full_mark: 100,
      pass_mark: 37,
    },
    {
      subject_name: 'Mathematics',
      has_practical: false,
      theory_full_mark: 100,
      theory_pass_mark: 40,
      score: 90,
      full_mark: 100,
      pass_mark: 40,
    },
  ];

  const summary = {
    total_full_mark: 400,
    total_obtained: 262,
  };

  const totals = calculateReportCardTotals(subjects, summary);

  // Theory full: 100 + 75 + 75 + 100 = 350
  assert.equal(totals.theoryFull, 350);
  assert.equal(totals.theoryPass, '-');
  // Theory obtained: 75 + 55 + 0 (absent) + 90 = 220
  assert.equal(totals.theoryObtained, 220);

  // Practical full: 25 + 25 = 50
  assert.equal(totals.practicalFull, 50);
  assert.equal(totals.practicalPass, '-');
  // Practical obtained: 22 + 20 = 42
  assert.equal(totals.practicalObtained, 42);

  assert.equal(totals.hasAnyPractical, true);
  assert.equal(totals.totalFull, 400);
  assert.equal(totals.totalObtained, 262);
});

test('calculateReportCardTotals: handles curriculum with zero practical subjects cleanly', () => {
  const subjects = [
    {
      subject_name: 'History',
      has_practical: false,
      score: 80,
      full_mark: 100,
      pass_mark: 40,
    },
    {
      subject_name: 'Geography',
      has_practical: false,
      score: 85,
      full_mark: 100,
      pass_mark: 40,
    },
  ];

  const summary = {
    total_full_mark: 200,
    total_obtained: 165,
  };

  const totals = calculateReportCardTotals(subjects, summary);
  assert.equal(totals.theoryFull, 200);
  assert.equal(totals.theoryObtained, 165);
  assert.equal(totals.practicalFull, 0);
  assert.equal(totals.practicalObtained, 0);
  assert.equal(totals.hasAnyPractical, false);
  assert.equal(totals.totalFull, 200);
  assert.equal(totals.totalObtained, 165);
});
