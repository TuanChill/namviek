import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSortedRecordIdsQuery, buildSortOrderClause } from './sort-sql.js';

test('buildSortedRecordIdsQuery emits parameterized SQL for text and number sorts', () => {
  const query = buildSortedRecordIdsQuery('db-1', [
    { fieldId: 'field-text', direction: 'asc' },
    { fieldId: 'field-number', direction: 'desc' },
  ], [
    { id: 'field-text', type: 'text' },
    { id: 'field-number', type: 'number' },
  ]);

  assert.match(query.sql, /SELECT r\."id" FROM dyn_records r/);
  assert.match(query.sql, /ORDER BY/);
  assert.match(query.sql, /LOWER\(COALESCE\(/);
  assert.match(query.sql, /NULLS LAST/);
  assert.equal(query.params[0], 'db-1');
  assert.equal(query.params[1], 'field-text');
  assert.equal(query.params[2], 'field-number');
});

test('buildSortOrderClause falls back to rowNumber when sort is empty or invalid', () => {
  const clause = buildSortOrderClause([], []);

  assert.equal(clause.text, 'r."rowNumber" ASC');
  assert.deepEqual(clause.params, []);
});