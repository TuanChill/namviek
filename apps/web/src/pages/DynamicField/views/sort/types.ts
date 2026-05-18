export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  id: string;
  fieldId: string;
  direction: SortDirection;
}

export type ViewSort = SortRule[];