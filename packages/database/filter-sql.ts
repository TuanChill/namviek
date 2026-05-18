import { endOfDay, startOfDay } from 'date-fns';
import type { Field } from './generated/client/client.js';
import { resolveDateRange } from './filter.js';
import type { DateMode, FilterGroup, FilterRule, ViewFilter } from './filter.js';

type SqlFragment = {
  text: string;
  params: unknown[];
};

type SqlQuery = {
  sql: string;
  params: unknown[];
};

type SupportedField = Pick<Field, 'id' | 'type'>;

const EMPTY_TEXT_ARRAY_SQL = "ARRAY[]::text[]";

export function buildFilteredRecordIdsQuery(
  databaseId: string,
  filter: ViewFilter,
  fields: SupportedField[],
): SqlQuery {
  const fieldMap = new Map(fields.map((field) => [field.id, field]));
  const predicate = buildGroupPredicate(filter, fieldMap);

  const statement = joinFragments([
    fragment(
      'SELECT r."id" FROM dyn_records r WHERE r."databaseId" = ? AND r."archivedAt" IS NULL AND ',
      [databaseId],
    ),
    wrap(predicate),
    fragment(' ORDER BY r."rowNumber" ASC'),
  ]);

  return finalizeQuery(statement);
}

function buildGroupPredicate(
  group: FilterGroup,
  fieldMap: Map<string, SupportedField>,
): SqlFragment {
  if (!group.children.length) {
    return fragment('TRUE');
  }

  const compiledChildren = group.children.map((child) =>
    child.type === 'group'
      ? buildGroupPredicate(child, fieldMap)
      : buildRulePredicate(child, fieldMap.get(child.fieldId)),
  );

  const separator = group.conjunction === 'AND' ? ' AND ' : ' OR ';
  return joinWrappedFragments(compiledChildren, separator);
}

function buildRulePredicate(rule: FilterRule, field: SupportedField | undefined): SqlFragment {
  if (!field) {
    return fragment('TRUE');
  }

  switch (field.type) {
    case 'text':
    case 'url':
    case 'email':
      return buildTextPredicate(rule);
    case 'number':
      return buildNumberPredicate(rule);
    case 'select':
      return buildSelectPredicate(rule);
    case 'multi_select':
      return buildArrayPredicate(rule, 'multiSelectValue');
    case 'checkbox':
      return buildCheckboxPredicate(rule);
    case 'person':
      return buildArrayPredicate(rule, 'personValue');
    case 'file':
      return buildFilePredicate(rule);
    case 'date':
      return buildDatePredicate(rule, buildFieldValueExpr(rule.fieldId, 'dateValue'));
    case 'created_time':
      return buildDatePredicate(rule, fragment('r."createdAt"'));
    case 'updated_time':
      return buildDatePredicate(rule, fragment('r."updatedAt"'));
    default:
      return fragment('TRUE');
  }
}

function buildTextPredicate(rule: FilterRule): SqlFragment {
  const valueExpr = textValueExpr(rule.fieldId);
  const value = String(rule.value ?? '');

  switch (rule.operator) {
    case 'is':
      return compareCaseInsensitive(valueExpr, '=', value);
    case 'is_not':
      return compareCaseInsensitive(valueExpr, '<>', value);
    case 'contains':
      return compareCaseInsensitive(valueExpr, 'LIKE', `%${value}%`);
    case 'does_not_contain':
      return compareCaseInsensitive(valueExpr, 'NOT LIKE', `%${value}%`);
    case 'is_empty':
      return compareRaw(valueExpr, '=', '');
    case 'is_not_empty':
      return compareRaw(valueExpr, '<>', '');
    default:
      return fragment('TRUE');
  }
}

function buildNumberPredicate(rule: FilterRule): SqlFragment {
  const valueExpr = buildFieldValueExpr(rule.fieldId, 'numberValue');

  if (rule.operator === 'is_empty') {
    return fragment(`${valueExpr.text} IS NULL`, valueExpr.params);
  }

  if (rule.operator === 'is_not_empty') {
    return fragment(`${valueExpr.text} IS NOT NULL`, valueExpr.params);
  }

  const value = Number(rule.value);
  if (Number.isNaN(value)) {
    return fragment('FALSE');
  }

  switch (rule.operator) {
    case 'eq':
      return compareNumeric(valueExpr, '=', value);
    case 'neq':
      return compareNumeric(valueExpr, '<>', value);
    case 'gt':
      return compareNumeric(valueExpr, '>', value);
    case 'lt':
      return compareNumeric(valueExpr, '<', value);
    case 'gte':
      return compareNumeric(valueExpr, '>=', value);
    case 'lte':
      return compareNumeric(valueExpr, '<=', value);
    default:
      return fragment('TRUE');
  }
}

function buildSelectPredicate(rule: FilterRule): SqlFragment {
  const valueExpr = textValueExpr(rule.fieldId, 'selectValue');
  const value = String(rule.value ?? '');

  switch (rule.operator) {
    case 'is':
      return compareRaw(valueExpr, '=', value);
    case 'is_not':
      return compareRaw(valueExpr, '<>', value);
    case 'is_empty':
      return compareRaw(valueExpr, '=', '');
    case 'is_not_empty':
      return compareRaw(valueExpr, '<>', '');
    default:
      return fragment('TRUE');
  }
}

function buildArrayPredicate(
  rule: FilterRule,
  column: 'multiSelectValue' | 'personValue',
): SqlFragment {
  const valueExpr = arrayValueExpr(rule.fieldId, column);
  const filterValues = Array.isArray(rule.value) ? rule.value.map(String) : [];

  switch (rule.operator) {
    case 'contains':
      return fragment(`${valueExpr.text} @> ?::text[]`, [...valueExpr.params, filterValues]);
    case 'does_not_contain':
      return fragment(`NOT (${valueExpr.text} && ?::text[])`, [...valueExpr.params, filterValues]);
    case 'is_empty':
      return fragment(`COALESCE(cardinality(${valueExpr.text}), 0) = 0`, valueExpr.params);
    case 'is_not_empty':
      return fragment(`COALESCE(cardinality(${valueExpr.text}), 0) > 0`, valueExpr.params);
    default:
      return fragment('TRUE');
  }
}

function buildCheckboxPredicate(rule: FilterRule): SqlFragment {
  const boolExpr = buildFieldValueExpr(rule.fieldId, 'boolValue');
  const valueExpr = fragment(`COALESCE(${boolExpr.text}, FALSE)`, boolExpr.params);
  const expected = rule.value === true || rule.value === 'true';

  if (rule.operator !== 'is') {
    return fragment('TRUE');
  }

  return fragment(`${valueExpr.text} = ?`, [...valueExpr.params, expected]);
}

function buildFilePredicate(rule: FilterRule): SqlFragment {
  const hasFiles = fragment(
    `EXISTS (
      SELECT 1
      FROM dyn_field_values fv
      WHERE fv."recordId" = r."id"
        AND fv."fieldId" = ?
        AND jsonb_typeof(COALESCE(fv."jsonValue"::jsonb, '[]'::jsonb)) = 'array'
        AND jsonb_array_length(COALESCE(fv."jsonValue"::jsonb, '[]'::jsonb)) > 0
    )`,
    [rule.fieldId],
  );

  switch (rule.operator) {
    case 'is_empty':
      return fragment(`NOT ${hasFiles.text}`, hasFiles.params);
    case 'is_not_empty':
      return hasFiles;
    default:
      return fragment('TRUE');
  }
}

function buildDatePredicate(rule: FilterRule, valueExpr: SqlFragment): SqlFragment {
  if (rule.operator === 'is_empty') {
    return fragment(`${valueExpr.text} IS NULL`, valueExpr.params);
  }

  if (rule.operator === 'is_not_empty') {
    return fragment(`${valueExpr.text} IS NOT NULL`, valueExpr.params);
  }

  const { start, end } = resolveDateRange(rule.dateMode as DateMode | undefined, rule.value);
  if (!start) {
    return fragment('FALSE');
  }

  const startBound = startOfDay(start);
  const endBound = endOfDay(end ?? start);

  switch (rule.operator) {
    case 'is':
      return fragment(`${valueExpr.text} >= ? AND ${valueExpr.text} <= ?`, [...valueExpr.params, startBound, ...valueExpr.params, endBound]);
    case 'is_before':
      return fragment(`${valueExpr.text} < ?`, [...valueExpr.params, startBound]);
    case 'is_after':
      return fragment(`${valueExpr.text} > ?`, [...valueExpr.params, endBound]);
    case 'is_on_or_before':
      return fragment(`${valueExpr.text} <= ?`, [...valueExpr.params, endBound]);
    case 'is_on_or_after':
      return fragment(`${valueExpr.text} >= ?`, [...valueExpr.params, startBound]);
    default:
      return fragment('TRUE');
  }
}

function buildFieldValueExpr(
  fieldId: string,
  column: 'textValue' | 'numberValue' | 'selectValue' | 'multiSelectValue' | 'dateValue' | 'personValue' | 'boolValue' | 'jsonValue',
): SqlFragment {
  return fragment(
    `(SELECT fv."${column}" FROM dyn_field_values fv WHERE fv."recordId" = r."id" AND fv."fieldId" = ? LIMIT 1)`,
    [fieldId],
  );
}

function textValueExpr(fieldId: string, column: 'textValue' | 'selectValue' = 'textValue'): SqlFragment {
  const baseExpr = buildFieldValueExpr(fieldId, column);
  return fragment(`COALESCE(${baseExpr.text}, '')`, baseExpr.params);
}

function arrayValueExpr(fieldId: string, column: 'multiSelectValue' | 'personValue'): SqlFragment {
  const baseExpr = buildFieldValueExpr(fieldId, column);
  return fragment(`COALESCE(${baseExpr.text}, ${EMPTY_TEXT_ARRAY_SQL})`, baseExpr.params);
}

function compareCaseInsensitive(expr: SqlFragment, operator: '=' | '<>' | 'LIKE' | 'NOT LIKE', value: string): SqlFragment {
  return fragment(`LOWER(${expr.text}) ${operator} LOWER(?)`, [...expr.params, value]);
}

function compareRaw(expr: SqlFragment, operator: '=' | '<>', value: string): SqlFragment {
  return fragment(`${expr.text} ${operator} ?`, [...expr.params, value]);
}

function compareNumeric(expr: SqlFragment, operator: '=' | '<>' | '>' | '<' | '>=' | '<=', value: number): SqlFragment {
  return fragment(`${expr.text} ${operator} ?`, [...expr.params, value]);
}

function fragment(text: string, params: unknown[] = []): SqlFragment {
  return { text, params };
}

function joinFragments(fragments: SqlFragment[]): SqlFragment {
  return fragments.reduce<SqlFragment>(
    (acc, current) => ({
      text: `${acc.text}${current.text}`,
      params: [...acc.params, ...current.params],
    }),
    fragment(''),
  );
}

function joinWrappedFragments(fragments: SqlFragment[], separator: string): SqlFragment {
  const wrapped = fragments.map(wrap);
  const text = wrapped.map((item) => item.text).join(separator);
  const params = wrapped.flatMap((item) => item.params);
  return fragment(text, params);
}

function wrap(value: SqlFragment): SqlFragment {
  return fragment(`(${value.text})`, value.params);
}

function finalizeQuery(statement: SqlFragment): SqlQuery {
  const placeholderCount = (statement.text.match(/\?/g) ?? []).length;
  if (placeholderCount !== statement.params.length) {
    throw new Error(
      `SQL placeholder mismatch: found ${placeholderCount} placeholders but ${statement.params.length} params`,
    );
  }

  let paramIndex = 0;
  const sql = statement.text.replace(/\?/g, () => {
    paramIndex += 1;
    return `$${paramIndex}`;
  });

  return {
    sql,
    params: statement.params,
  };
}