export type FieldType =
  | 'text' | 'number' | 'select' | 'multi_select' | 'date'
  | 'person' | 'checkbox' | 'file' | 'url' | 'email'
  | 'id' | 'created_time' | 'created_by' | 'updated_time' | 'updated_by';

export interface FieldConfig {
  // date
  dateFormat?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'MMM D, YYYY';
  includeTime?: boolean;
  // number
  numberFormat?: 'integer' | 'decimal' | 'percent' | 'currency';
  precision?: number;
  currency?: string;
  showAs?: 'number' | 'bar' | 'ring';
  divideBy?: number;
  color?: string;
  showNumber?: boolean;
  // text
  richText?: boolean;
  // person
  allowMultiple?: boolean;
  /** If set and non-empty, only these user IDs are shown in the picker */
  allowedUserIds?: string[];
  // file
  allowMultipleFiles?: boolean;
  // visual override
  customIcon?: string;
}

export interface FileAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
}



export interface FieldOption {
  id: string;
  label: string;
  color?: string | null;
  position: number;
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  position: number;
  isPrimary: boolean;
  config?: FieldConfig | null;
  options: FieldOption[];
}

export interface FieldValue {
  id: string;
  fieldId: string;
  recordId: string;
  textValue?: string | null;
  numberValue?: string | null;
  selectValue?: string | null;
  multiSelectValue?: string[];
  dateValue?: string | null;
  personValue?: string[];
  boolValue?: boolean | null;
  jsonValue?: unknown;
  field: Field;
}

export interface DynUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface DynRecord {
  id: string;
  rowNumber: number;
  createdAt: string;
  updatedAt: string;
  fieldValues: FieldValue[];
}

export interface DynDatabase {
  id: string;
  name: string;
  createdAt: string;
  _count: { fields: number; records: number };
}

export type FieldValuePayload = {
  textValue?: string | null;
  numberValue?: number | null;
  selectValue?: string | null;
  multiSelectValue?: string[];
  dateValue?: string | null;
  personValue?: string[];
  boolValue?: boolean | null;
};

// ─── View system ──────────────────────────────────────────────────────────────

export type DynViewType = 'spreadsheet' | 'kanban' | 'calendar' | 'timeline';

export interface ViewGroupByConfig {
  fieldId: string;
  fieldType: 'select' | 'multi_select' | 'date' | 'created_time' | 'updated_time';
  granularity?: 'day' | 'month' | 'quarter';
}

export interface ViewConfig {
  groupBy?: ViewGroupByConfig;
  filter?: unknown;
  sort?: unknown;
  fieldOrder?: string[];
  fieldWidths?: Record<string, number>;
  hiddenFieldIds?: string[];
}

export interface DynView {
  id: string;
  databaseId: string;
  name: string;
  icon?: string | null;
  type: DynViewType;
  position: number;
  isDefault: boolean;
  config?: ViewConfig | null;
  createdAt: string;
  updatedAt: string;
}
