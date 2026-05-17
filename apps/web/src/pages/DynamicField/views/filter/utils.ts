import type { FilterRule, FilterGroup, ViewFilter, FilterOperator, Conjunction } from './types';
import { getDefaultOperator } from './constants';
import type { FieldType } from '../../types';

// ─── Factories ────────────────────────────────────────────────────────────────

export function makeRule(fieldId: string, fieldType: FieldType): FilterRule {
  return {
    id: crypto.randomUUID(),
    type: 'rule',
    fieldId,
    operator: getDefaultOperator(fieldType),
    value: null,
    // Initialize dateMode for date fields to match UI defaults
    dateMode: (fieldType === 'date' || fieldType === 'created_time' || fieldType === 'updated_time') ? 'exact_date' : undefined,
  };
}

export function makeGroup(conjunction: Conjunction = 'AND'): FilterGroup {
  return { id: crypto.randomUUID(), type: 'group', conjunction, children: [] };
}

export function makeRootFilter(): ViewFilter {
  return makeGroup('AND');
}

// ─── Immutable tree mutations ─────────────────────────────────────────────────

/** Add a new rule to the group with the given id. */
export function addRule(
  root: ViewFilter,
  groupId: string,
  fieldId: string,
  fieldType: FieldType,
): ViewFilter {
  return mapGroup(root, groupId, g => ({
    ...g,
    children: [...g.children, makeRule(fieldId, fieldType)],
  }));
}

/** Add a new nested group inside the group with the given id. */
export function addGroup(root: ViewFilter, groupId: string): ViewFilter {
  return mapGroup(root, groupId, g => ({
    ...g,
    children: [...g.children, makeGroup('OR')],
  }));
}

/** Delete any node (rule or group) by id. */
export function deleteNode(root: ViewFilter, nodeId: string): ViewFilter {
  function strip(node: FilterGroup): FilterGroup {
    return {
      ...node,
      children: node.children
        .filter(c => c.id !== nodeId)
        .map(c => (c.type === 'group' ? strip(c) : c)),
    };
  }
  return strip(root);
}

/** Update fields on a FilterRule by id. */
export function updateRule(
  root: ViewFilter,
  ruleId: string,
  patch: Partial<Omit<FilterRule, 'id' | 'type'>>,
): ViewFilter {
  function walk(node: FilterGroup): FilterGroup {
    return {
      ...node,
      children: node.children.map(c => {
        if (c.type === 'rule' && c.id === ruleId) return { ...c, ...patch };
        if (c.type === 'group') return walk(c);
        return c;
      }),
    };
  }
  return walk(root);
}

/** Change the conjunction of the group with the given id. */
export function updateConjunction(
  root: ViewFilter,
  groupId: string,
  conjunction: Conjunction,
): ViewFilter {
  return mapGroup(root, groupId, g => ({ ...g, conjunction }));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Count total FilterRule nodes in the tree (for badge display). */
export function countRules(node: FilterGroup): number {
  return node.children.reduce<number>((acc, c) => {
    if (c.type === 'rule') return acc + 1;
    return acc + countRules(c);
  }, 0);
}

/** Returns true when the filter has no rules (empty / no-op). */
export function isFilterEmpty(filter: ViewFilter | null | undefined): boolean {
  if (!filter) return true;
  return countRules(filter) === 0;
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function mapGroup(
  node: FilterGroup,
  targetId: string,
  fn: (g: FilterGroup) => FilterGroup,
): FilterGroup {
  if (node.id === targetId) return fn(node);
  return {
    ...node,
    children: node.children.map(c =>
      c.type === 'group' ? mapGroup(c, targetId, fn) : c,
    ),
  };
}
