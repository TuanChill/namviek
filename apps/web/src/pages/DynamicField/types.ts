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
  // text
  richText?: boolean;
  // person
  allowMultiple?: boolean;
  /** If set and non-empty, only these user IDs are shown in the picker */
  allowedUserIds?: string[];
  // visual override
  customIcon?: string;
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
