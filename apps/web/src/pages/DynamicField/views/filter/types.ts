export type Conjunction = 'AND' | 'OR';

export type FilterOperator =
  // text / number / select / multi_select / person
  | 'is' | 'is_not' | 'contains' | 'does_not_contain'
  // number
  | 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq'
  // date
  | 'is_before' | 'is_after' | 'is_on_or_before' | 'is_on_or_after'
  // empty checks
  | 'is_empty' | 'is_not_empty';

// Relative date modes — no value input needed; resolved at apply time
export type RelativeDateMode =
  | 'today' | 'yesterday' | 'tomorrow'
  | 'current_week' | 'last_week' | 'next_week'
  | 'current_month' | 'last_month' | 'next_month';

export type DateMode = 'exact_date' | 'custom_range' | RelativeDateMode;

export interface FilterRule {
  id: string;
  type: 'rule';
  fieldId: string;
  operator: FilterOperator;
  /** Relative / exact / range mode; only used when field type is date */
  dateMode?: DateMode;
  /** The filter value — string | string[] | boolean | null */
  value: unknown;
}

export interface FilterGroup {
  id: string;
  type: 'group';
  conjunction: Conjunction;
  children: (FilterRule | FilterGroup)[];
}

/** The root filter is always a group */
export type ViewFilter = FilterGroup;
