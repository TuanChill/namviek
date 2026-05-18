import type { Field } from './generated/client/client.js';
import type { SqlFragment } from './filter-sql.js';

type SupportedField = Pick<Field, 'id' | 'type'>;

export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  fieldId: string;
  direction: SortDirection;
}

export type ViewSort = SortRule[];

const EMPTY_TEXT_ARRAY_SQL = 'ARRAY[]::text[]';

export function buildSortOrderClause(
  sort: ViewSort | null | undefined,
  fields: SupportedField[],
): SqlFragment {
  const fieldMap = new Map(fields.map((field) => [field.id, field]));
  const clauses = (sort ?? [])
    .map((rule) => buildRuleOrderClause(rule, fieldMap.get(rule.fieldId)))
    .filter((clause): clause is SqlFragment => clause !== null);

  if (clauses.length === 0) {
    return fragment('r."rowNumber" ASC');
  }

  return joinFragments([
    ...clauses.flatMap((clause, index) => [clause, index < clauses.length - 1 ? fragment(', ') : fragment('')]),
  ]);
}

export function buildSortedRecordIdsQuery(
  databaseId: string,
  sort: ViewSort | null | undefined,
  fields: SupportedField[],
): { sql: string; params: unknown[] } {
  const orderClause = buildSortOrderClause(sort, fields);
  const statement = joinFragments([
    fragment(
      'SELECT r."id" FROM dyn_records r WHERE r."databaseId" = ? AND r."archivedAt" IS NULL ORDER BY ',
      [databaseId],
    ),
    orderClause,
  ]);

  return finalizeQuery(statement);
}

function buildRuleOrderClause(rule: SortRule, field: SupportedField | undefined): SqlFragment | null {
  if (!field || (rule.direction !== 'asc' && rule.direction !== 'desc')) {
    return null;
  }

  const direction = rule.direction.toUpperCase();

  switch (field.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'select':
      return fragment(`LOWER(COALESCE(${buildFieldValueExpr(rule.fieldId, field.type === 'select' ? 'selectValue' : 'textValue').text}, '')) ${direction} NULLS LAST`, buildFieldValueExpr(rule.fieldId, field.type === 'select' ? 'selectValue' : 'textValue').params);

    case 'multi_select':
      return fragment(
        `LOWER(COALESCE(array_to_string(${buildFieldValueExpr(rule.fieldId, 'multiSelectValue').text}, ','), '')) ${direction} NULLS LAST`,
        buildFieldValueExpr(rule.fieldId, 'multiSelectValue').params,
      );

    case 'person':
      return fragment(
        `LOWER(COALESCE(array_to_string(${buildFieldValueExpr(rule.fieldId, 'personValue').text}, ','), '')) ${direction} NULLS LAST`,
        buildFieldValueExpr(rule.fieldId, 'personValue').params,
      );

    case 'number':
      return fragment(`${buildFieldValueExpr(rule.fieldId, 'numberValue').text} ${direction} NULLS LAST`, buildFieldValueExpr(rule.fieldId, 'numberValue').params);

    case 'checkbox':
      return fragment(
        `COALESCE(${buildFieldValueExpr(rule.fieldId, 'boolValue').text}, FALSE) ${direction} NULLS LAST`,
        buildFieldValueExpr(rule.fieldId, 'boolValue').params,
      );

    case 'file':
      return fragment(
        `COALESCE(COALESCE(jsonb_array_length(COALESCE(${buildFieldValueExpr(rule.fieldId, 'jsonValue').text}::jsonb, '[]'::jsonb)), 0), 0) ${direction} NULLS LAST`,
        buildFieldValueExpr(rule.fieldId, 'jsonValue').params,
      );

    case 'date':
      return fragment(`${buildFieldValueExpr(rule.fieldId, 'dateValue').text} ${direction} NULLS LAST`, buildFieldValueExpr(rule.fieldId, 'dateValue').params);

    case 'created_time':
      return fragment(`r."createdAt" ${direction} NULLS LAST`);

    case 'updated_time':
      return fragment(`r."updatedAt" ${direction} NULLS LAST`);

    default:
      return null;
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

type SqlQuery = {
  sql: string;
  params: unknown[];
};

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

  return { sql, params: statement.params };
}