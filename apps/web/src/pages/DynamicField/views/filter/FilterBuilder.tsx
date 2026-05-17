/**
 * FilterBuilder
 *
 * Self-contained filter panel. Pass `view` + `fields` from the parent scope.
 * Emits the full ViewFilter AST via `onChange` — the parent decides when to persist.
 *
 * Usage:
 *   <FilterBuilder view={activeView} fields={fields} onChange={filter => save(filter)} />
 */

import { useState, useEffect, useCallback } from 'react';
import { FilterGroupBlock } from './FilterGroupBlock';
import { useUsers } from '../../hooks/useUsers';
import {
  makeRootFilter,
  addRule,
  addGroup,
  deleteNode,
  updateRule,
  updateConjunction,
  isFilterEmpty,
} from './utils';
import type { ViewFilter, FilterRule, Conjunction } from './types';
import type { DynView, Field } from '../../types';

interface FilterBuilderProps {
  view: DynView;
  fields: Field[];
  onChange: (filter: ViewFilter) => void;
}

export function FilterBuilder({ view, fields, onChange }: FilterBuilderProps) {
  const { users } = useUsers();

  // Initialise from view.config.filter; re-initialise when the view changes
  const [filter, setFilter] = useState<ViewFilter>(() => {
    const saved = view.config?.filter as ViewFilter | undefined;
    return saved ?? makeRootFilter();
  });

  // When the active view switches, load that view's filter
  useEffect(() => {
    const saved = view.config?.filter as ViewFilter | undefined;
    setFilter(saved ?? makeRootFilter());
  }, [view.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wrap every mutation: update local state AND notify parent
  const mutate = useCallback((next: ViewFilter) => {
    setFilter(next);
    onChange(next);
  }, [onChange]);

  // ── Filterable fields (exclude computed types that don't make sense) ────────
  const filterableFields = fields.filter(f =>
    !['id', 'created_time', 'created_by', 'updated_time', 'updated_by'].includes(f.type),
  );

  const handleAddRule = (groupId: string) => {
    const firstField = filterableFields[0];
    if (!firstField) return;
    mutate(addRule(filter, groupId, firstField.id, firstField.type));
  };

  const handleAddGroup = (groupId: string) => {
    mutate(addGroup(filter, groupId));
  };

  const handleDeleteNode = (nodeId: string) => {
    mutate(deleteNode(filter, nodeId));
  };

  const handleUpdateRule = (ruleId: string, patch: Partial<Omit<FilterRule, 'id' | 'type'>>) => {
    mutate(updateRule(filter, ruleId, patch));
  };

  const handleUpdateConjunction = (groupId: string, conjunction: Conjunction) => {
    mutate(updateConjunction(filter, groupId, conjunction));
  };

  return (
    <div className="flex flex-col gap-3 p-3 min-w-[480px]">
      {isFilterEmpty(filter) ? (
        <>
          <p className="text-xs text-muted-foreground px-1">No filter conditions are applied</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddRule(filter.id)}
              disabled={filterableFields.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-xs hover:bg-accent transition-colors disabled:opacity-50"
            >
              + Add condition
            </button>
            <button
              onClick={() => handleAddGroup(filter.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-xs hover:bg-accent transition-colors"
            >
              + Add condition group
            </button>
          </div>
        </>
      ) : (
        <FilterGroupBlock
          group={filter}
          fields={filterableFields}
          users={users}
          isRoot
          onAddRule={handleAddRule}
          onAddGroup={handleAddGroup}
          onDeleteNode={handleDeleteNode}
          onUpdateRule={handleUpdateRule}
          onUpdateConjunction={handleUpdateConjunction}
        />
      )}
    </div>
  );
}
