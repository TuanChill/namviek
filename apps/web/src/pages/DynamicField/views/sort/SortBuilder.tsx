import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortRuleRow } from './SortRuleRow';
import {
  addSortRule,
  deleteSortRule,
  makeRootSort,
  moveSortRule,
  updateSortRule,
} from './utils';
import type { DynView, Field } from '../../types';
import type { ViewSort } from './types';

interface SortBuilderProps {
  view: DynView;
  fields: Field[];
  onChange: (sort: ViewSort) => void;
}

export function SortBuilder({ view, fields, onChange }: SortBuilderProps) {
  const [sort, setSort] = useState<ViewSort>(() => {
    const saved = view.config?.sort as ViewSort | undefined;
    return saved ?? makeRootSort();
  });

  useEffect(() => {
    const saved = view.config?.sort as ViewSort | undefined;
    setSort(saved ?? makeRootSort());
  }, [view.id]);

  const mutate = useCallback((next: ViewSort) => {
    setSort(next);
    onChange(next);
  }, [onChange]);

  const sortableFields = fields.filter(f => !['created_by', 'updated_by'].includes(f.type));

  const handleAddSort = () => {
    const firstField = sortableFields[0];
    if (!firstField) return;
    mutate(addSortRule(sort, firstField.id));
  };

  const handleDeleteSort = (ruleId: string) => {
    mutate(deleteSortRule(sort, ruleId));
  };

  const handleUpdateSort = (ruleId: string, patch: Parameters<typeof updateSortRule>[2]) => {
    mutate(updateSortRule(sort, ruleId, patch));
  };

  const handleMoveSort = (ruleId: string, direction: 'up' | 'down') => {
    mutate(moveSortRule(sort, ruleId, direction));
  };

  return (
    <div className="flex flex-col gap-3 p-3 min-w-[480px]">
      {sort.length === 0 ? (
        <>
          <p className="text-xs text-muted-foreground px-1">No sort order is applied</p>
          <Button
            onClick={handleAddSort}
            disabled={sortableFields.length === 0}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 w-fit"
          >
            <Plus size={12} /> Add sort
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {sort.map((rule, index) => (
              <SortRuleRow
                key={rule.id}
                rule={rule}
                fields={sortableFields}
                isFirst={index === 0}
                isLast={index === sort.length - 1}
                onUpdate={patch => handleUpdateSort(rule.id, patch)}
                onDelete={() => handleDeleteSort(rule.id)}
                onMoveUp={() => handleMoveSort(rule.id, 'up')}
                onMoveDown={() => handleMoveSort(rule.id, 'down')}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 w-fit"
            onClick={handleAddSort}
            disabled={sortableFields.length === 0}
          >
            <Plus size={12} /> Add another sort
          </Button>
        </>
      )}
    </div>
  );
}