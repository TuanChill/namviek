import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilterRuleRow } from './FilterRuleRow';
import type { FilterGroup, FilterRule, ViewFilter, Conjunction } from './types';
import type { Field, DynUser } from '../../types';

interface FilterGroupBlockProps {
  group: FilterGroup;
  fields: Field[];
  users: DynUser[];
  isRoot?: boolean;
  onAddRule: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateRule: (ruleId: string, patch: Partial<Omit<FilterRule, 'id' | 'type'>>) => void;
  onUpdateConjunction: (groupId: string, conjunction: Conjunction) => void;
}

const CONJUNCTION_LABELS: Record<Conjunction, string> = {
  AND: 'Meeting all conditions',
  OR:  'Meeting any conditions',
};

export function FilterGroupBlock({
  group,
  fields,
  users,
  isRoot = false,
  onAddRule,
  onAddGroup,
  onDeleteNode,
  onUpdateRule,
  onUpdateConjunction,
}: FilterGroupBlockProps) {
  return (
    <div className={`flex flex-col gap-2 ${!isRoot ? 'border-l-2 border-neutral-700 pl-3' : ''}`}>
      {/* Conjunction toggle + group delete */}
      <div className="flex items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {CONJUNCTION_LABELS[group.conjunction]}
              <ChevronDown size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {(['AND', 'OR'] as Conjunction[]).map(c => (
              <DropdownMenuItem
                key={c}
                onClick={() => onUpdateConjunction(group.id, c)}
                className={`text-xs ${group.conjunction === c ? 'font-semibold' : ''}`}
              >
                {CONJUNCTION_LABELS[c]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete group (not shown for root) */}
        {!isRoot && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteNode(group.id)}
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>

      {/* Children */}
      {group.children.length > 0 && (
        <div className="flex flex-col gap-2">
          {group.children.map(child =>
            child.type === 'rule' ? (
              <FilterRuleRow
                key={child.id}
                rule={child}
                fields={fields}
                users={users}
                onUpdate={patch => onUpdateRule(child.id, patch)}
                onDelete={() => onDeleteNode(child.id)}
              />
            ) : (
              <FilterGroupBlock
                key={child.id}
                group={child}
                fields={fields}
                users={users}
                isRoot={false}
                onAddRule={onAddRule}
                onAddGroup={onAddGroup}
                onDeleteNode={onDeleteNode}
                onUpdateRule={onUpdateRule}
                onUpdateConjunction={onUpdateConjunction}
              />
            ),
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => onAddRule(group.id)}
          disabled={fields.length === 0}
        >
          <Plus size={12} /> Add condition
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => onAddGroup(group.id)}
        >
          <Plus size={12} /> Add condition group
        </Button>
      </div>
    </div>
  );
}
