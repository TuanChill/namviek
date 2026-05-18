import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFilteredRecordIdsQuery } from './filter-sql.js';
import type { ViewFilter } from './filter.js';

test('buildFilteredRecordIdsQuery emits parameterized SQL for text and date rules', () => {
  const filter: ViewFilter = {
    id: 'root',
    type: 'group',
    conjunction: 'AND',
    children: [
      {
        id: 'rule-text',
        type: 'rule',
        fieldId: 'field-text',
        operator: 'contains',
        value: 'hello',
      },
      {
        id: 'rule-date',
        type: 'rule',
        fieldId: 'field-date',
        operator: 'is_after',
        dateMode: 'exact_date',
        value: '2026-05-18',
      },
    ],
  };

  const query = buildFilteredRecordIdsQuery('db-1', filter, [
    { id: 'field-text', type: 'text' },
    { id: 'field-date', type: 'date' },
  ]);

  assert.match(query.sql, /SELECT r\."id" FROM dyn_records r/);
  assert.match(query.sql, /r\."archivedAt" IS NULL/);
  assert.match(query.sql, /LOWER\(COALESCE\(/);
  assert.match(query.sql, /ORDER BY r\."rowNumber" ASC/);
  assert.equal(query.params[0], 'db-1');
  assert.equal(query.params[1], 'field-text');
  assert.equal(query.params[2], '%hello%');
  assert.equal(query.params[3], 'field-date');
});

test('buildFilteredRecordIdsQuery keeps file predicates readable with EXISTS', () => {
  const filter: ViewFilter = {
    id: 'root',
    type: 'group',
    conjunction: 'AND',
    children: [
      {
        id: 'rule-file',
        type: 'rule',
        fieldId: 'field-file',
        operator: 'is_not_empty',
        value: null,
      },
    ],
  };

  const query = buildFilteredRecordIdsQuery('db-1', filter, [
    { id: 'field-file', type: 'file' },
  ]);

  assert.match(query.sql, /EXISTS \(/);
  assert.match(query.sql, /jsonb_array_length/);
  assert.deepEqual(query.params, ['db-1', 'field-file']);
});

test('buildFilteredRecordIdsQuery uses postgres array operators for multi select filters', () => {
  const filter: ViewFilter = {
    id: 'root',
    type: 'group',
    conjunction: 'OR',
    children: [
      {
        id: 'rule-multi',
        type: 'rule',
        fieldId: 'field-multi',
        operator: 'contains',
        value: ['opt-a', 'opt-b'],
      },
      {
        id: 'rule-person',
        type: 'rule',
        fieldId: 'field-person',
        operator: 'does_not_contain',
        value: ['user-1'],
      },
    ],
  };

  const query = buildFilteredRecordIdsQuery('db-1', filter, [
    { id: 'field-multi', type: 'multi_select' },
    { id: 'field-person', type: 'person' },
  ]);

  assert.match(query.sql, /@> \$\d+::text\[\]/);
  assert.match(query.sql, /&& \$\d+::text\[\]/);
  assert.deepEqual(query.params, ['db-1', 'field-multi', ['opt-a', 'opt-b'], 'field-person', ['user-1']]);
});