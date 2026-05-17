// Quick test of date filter logic
import { parseISO, isValid, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';

function resolveDateRange(dateMode, filterValue) {
  switch (dateMode) {
    case 'exact_date': {
      const d = filterValue ? parseISO(String(filterValue)) : null;
      if (!d || !isValid(d)) return { start: null, end: null };
      return { start: d, end: d };
    }
    default: {
      const d = filterValue ? parseISO(String(filterValue)) : null;
      if (!d || !isValid(d)) return { start: null, end: null };
      return { start: d, end: d };
    }
  }
}

function evalDate(op, rawValue, dateMode, filterValue) {
  if (op === 'is_empty') return !rawValue;
  if (op === 'is_not_empty') return !!rawValue;

  const cellDate = rawValue ? parseISO(rawValue) : null;
  if (!cellDate || !isValid(cellDate)) return false;

  const { start: rangeStart, end: rangeEnd } = resolveDateRange(dateMode, filterValue);
  if (!rangeStart) return false;

  const effectiveEnd = rangeEnd ?? rangeStart;

  switch (op) {
    case 'is':
      return !isBefore(cellDate, startOfDay(rangeStart)) && !isAfter(cellDate, endOfDay(effectiveEnd));
    case 'is_before':
      return isBefore(cellDate, startOfDay(rangeStart));
    case 'is_after':
      return isAfter(cellDate, endOfDay(effectiveEnd));
    case 'is_on_or_before':
      return !isAfter(cellDate, endOfDay(effectiveEnd));
    case 'is_on_or_after':
      return !isBefore(cellDate, startOfDay(rangeStart));
    default: return true;
  }
}

// Test cases
console.log('Testing date filter logic:');
console.log('');

// Test data
const filterDate = '2026-05-17'; // The date the user filters by
const testCases = [
  { cellDate: '2026-05-16', op: 'is_before', expected: true, desc: 'May 16 is before May 17' },
  { cellDate: '2026-05-17', op: 'is_before', expected: false, desc: 'May 17 is not before May 17' },
  { cellDate: '2026-05-18', op: 'is_before', expected: false, desc: 'May 18 is not before May 17' },
  
  { cellDate: '2026-05-16', op: 'is_after', expected: false, desc: 'May 16 is not after May 17' },
  { cellDate: '2026-05-17', op: 'is_after', expected: false, desc: 'May 17 is not after May 17' },
  { cellDate: '2026-05-18', op: 'is_after', expected: true, desc: 'May 18 is after May 17' },
  
  { cellDate: '2026-05-16', op: 'is_on_or_before', expected: true, desc: 'May 16 is on or before May 17' },
  { cellDate: '2026-05-17', op: 'is_on_or_before', expected: true, desc: 'May 17 is on or before May 17' },
  { cellDate: '2026-05-18', op: 'is_on_or_before', expected: false, desc: 'May 18 is not on or before May 17' },
  
  { cellDate: '2026-05-16', op: 'is_on_or_after', expected: false, desc: 'May 16 is not on or after May 17' },
  { cellDate: '2026-05-17', op: 'is_on_or_after', expected: true, desc: 'May 17 is on or after May 17' },
  { cellDate: '2026-05-18', op: 'is_on_or_after', expected: true, desc: 'May 18 is on or after May 17' },

  { cellDate: '2026-05-17', op: 'is', expected: true, desc: 'May 17 is exactly May 17' },
  { cellDate: '2026-05-16', op: 'is', expected: false, desc: 'May 16 is not exactly May 17' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ cellDate, op, expected, desc }) => {
  const result = evalDate(op, cellDate, 'exact_date', filterDate);
  const status = result === expected ? '✓' : '✗';
  const color = result === expected ? '\x1b[32m' : '\x1b[31m';
  
  if (result === expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${color}${status}\x1b[0m ${op.padEnd(17)} ${desc} (got ${result}, expected ${expected})`);
});

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n⚠️  There are failing tests!');
  process.exit(1);
}
