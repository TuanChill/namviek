import type { SortDirection, SortRule, ViewSort } from './types';

export function makeSortRule(fieldId: string, direction: SortDirection = 'asc'): SortRule {
  return {
    id: crypto.randomUUID(),
    fieldId,
    direction,
  };
}

export function makeRootSort(): ViewSort {
  return [];
}

export function addSortRule(sort: ViewSort, fieldId: string): ViewSort {
  return [...sort, makeSortRule(fieldId)];
}

export function deleteSortRule(sort: ViewSort, ruleId: string): ViewSort {
  return sort.filter(rule => rule.id !== ruleId);
}

export function updateSortRule(
  sort: ViewSort,
  ruleId: string,
  patch: Partial<Omit<SortRule, 'id'>>,
): ViewSort {
  return sort.map(rule => rule.id === ruleId ? { ...rule, ...patch } : rule);
}

export function moveSortRule(sort: ViewSort, ruleId: string, direction: 'up' | 'down'): ViewSort {
  const index = sort.findIndex(rule => rule.id === ruleId);
  if (index === -1) return sort;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= sort.length) return sort;

  const next = [...sort];
  [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  return next;
}