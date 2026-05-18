import type { FieldType } from '../../types';
import type { SortDirection } from './types';

type DirectionLabels = Record<SortDirection, string>;

const TEXT_LABELS: DirectionLabels = {
  asc: 'A → Z',
  desc: 'Z → A',
};

const NUMBER_LABELS: DirectionLabels = {
  asc: '1 → 9',
  desc: '9 → 1',
};

const DATE_LABELS: DirectionLabels = {
  asc: 'first → last',
  desc: 'last → first',
};

const CHECKBOX_LABELS: DirectionLabels = {
  asc: 'unchecked → checked',
  desc: 'checked → unchecked',
};

const SORT_DIRECTION_LABELS: Partial<Record<FieldType, DirectionLabels>> = {
  text: TEXT_LABELS,
  url: TEXT_LABELS,
  email: TEXT_LABELS,
  select: TEXT_LABELS,
  multi_select: TEXT_LABELS,
  person: TEXT_LABELS,
  id: TEXT_LABELS,
  number: NUMBER_LABELS,
  date: DATE_LABELS,
  created_time: DATE_LABELS,
  updated_time: DATE_LABELS,
  checkbox: CHECKBOX_LABELS,
  file: TEXT_LABELS,
};

export function getSortDirectionLabelsForFieldType(fieldType: FieldType): DirectionLabels {
  return SORT_DIRECTION_LABELS[fieldType] ?? TEXT_LABELS;
}
