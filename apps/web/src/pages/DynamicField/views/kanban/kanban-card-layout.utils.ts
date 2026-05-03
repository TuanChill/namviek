import { Link as LinkIcon } from 'lucide-react';
import { getFieldMeta } from '../../constants';
import type {
  DynRecord,
  DynUser,
  Field,
  FieldValue,
  ViewConfig,
  ViewKanbanCardLayout,
} from '../../types';

type ConfigWithLegacyKanbanLayout = ViewConfig & {
  card_layout?: ViewKanbanCardLayout;
};

export type CardSection = 'header' | 'footer';

interface PreviewRecordOptions {
  primaryTitle?: string;
}

export const KANBAN_PREVIEW_USERS: DynUser[] = [
  {
    id: 'preview-user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatarUrl: 'https://i.pravatar.cc/80?img=32',
  },
  {
    id: 'preview-user-2',
    name: 'Marcus Lee',
    email: 'marcus@example.com',
    avatarUrl: 'https://i.pravatar.cc/80?img=12',
  },
  {
    id: 'preview-user-3',
    name: 'Priya Shah',
    email: 'priya@example.com',
    avatarUrl: 'https://i.pravatar.cc/80?img=48',
  },
];

export function getKanbanCardLayout(config: ViewConfig | null | undefined, fields: Field[]): ViewKanbanCardLayout {
  const rawConfig = config as ConfigWithLegacyKanbanLayout | null | undefined;
  const layout = rawConfig?.cardLayout ?? rawConfig?.card_layout;
  const fallbackHiddenIds = new Set(rawConfig?.hiddenFieldIds ?? []);
  const eligibleFields = fields.filter(field => !field.isPrimary && field.type !== 'id');
  const eligibleIds = new Set(eligibleFields.map(field => field.id));

  if (!layout) {
    return {
      header: [],
      footer: eligibleFields.filter(field => !fallbackHiddenIds.has(field.id)).map(field => field.id),
    };
  }

  const dedupe = (fieldIds: string[] | undefined) => {
    const seen = new Set<string>();

    return (fieldIds ?? []).filter(fieldId => {
      if (!eligibleIds.has(fieldId) || seen.has(fieldId)) {
        return false;
      }
      seen.add(fieldId);
      return true;
    });
  };

  const header = dedupe(layout.header);
  const headerIds = new Set(header);
  const footer = dedupe(layout.footer).filter(fieldId => !headerIds.has(fieldId));

  return { header, footer };
}

export function getKanbanAvailableFields(fields: Field[], layout: ViewKanbanCardLayout): Field[] {
  const used = new Set([...layout.header, ...layout.footer]);
  return fields.filter(field => !field.isPrimary && field.type !== 'id' && !used.has(field.id));
}

export function buildKanbanPreviewRecord(fields: Field[], options?: PreviewRecordOptions): DynRecord {
  const fieldValues: FieldValue[] = [];
  const previewUsers = KANBAN_PREVIEW_USERS.map(user => user.id);
  const primaryField = fields.find(field => field.isPrimary) ?? fields[0] ?? null;

  for (const field of fields) {
    const baseValue = {
      id: `preview-value-${field.id}`,
      fieldId: field.id,
      recordId: 'preview-record',
      field,
    } satisfies Pick<FieldValue, 'id' | 'fieldId' | 'recordId' | 'field'>;

    if (field.isPrimary) {
      fieldValues.push({
        ...baseValue,
        textValue: options?.primaryTitle ?? `${field.name} for Q2 launch`,
      });
      continue;
    }

    switch (field.type) {
      case 'text':
        fieldValues.push({ ...baseValue, textValue: `${field.name} sample` });
        break;
      case 'number':
        fieldValues.push({ ...baseValue, numberValue: '42' });
        break;
      case 'select':
        fieldValues.push({ ...baseValue, selectValue: field.options[0]?.id ?? null });
        break;
      case 'multi_select':
        fieldValues.push({ ...baseValue, multiSelectValue: field.options.slice(0, 2).map(option => option.id) });
        break;
      case 'date':
        fieldValues.push({ ...baseValue, dateValue: '2026-05-14' });
        break;
      case 'person':
        fieldValues.push({
          ...baseValue,
          personValue: field.config?.allowMultiple ? previewUsers.slice(0, 2) : previewUsers.slice(0, 1),
        });
        break;
      case 'checkbox':
        fieldValues.push({ ...baseValue, boolValue: true });
        break;
      case 'url':
        fieldValues.push({ ...baseValue, textValue: 'https://namviek.app/specs' });
        break;
      case 'email':
        fieldValues.push({ ...baseValue, textValue: 'owner@namviek.app' });
        break;
      case 'file':
        fieldValues.push({
          ...baseValue,
          jsonValue: [
            { name: 'spec-v3.pdf', url: 'https://example.com/spec-v3.pdf', size: 124000, type: 'application/pdf' },
          ],
        });
        break;
      default:
        break;
    }
  }

  if (primaryField && !fieldValues.some(value => value.fieldId === primaryField.id)) {
    fieldValues.push({
      id: `preview-value-${primaryField.id}`,
      fieldId: primaryField.id,
      recordId: 'preview-record',
      textValue: options?.primaryTitle ?? `${primaryField.name} for Q2 launch`,
      field: primaryField,
    });
  }

  return {
    id: 'preview-record',
    rowNumber: 101,
    createdAt: '2026-05-01T09:00:00.000Z',
    updatedAt: '2026-05-03T15:30:00.000Z',
    fieldValues,
  };
}

export function getSectionLabel(section: CardSection) {
  return section === 'header' ? 'Header' : 'Footer';
}

export function getSectionActionLabel(section: CardSection) {
  return section === 'header' ? 'Add to header' : 'Add to footer';
}

export function getFieldSectionIcon(field: Field) {
  if (field.type === 'url' || field.type === 'email') {
    return LinkIcon;
  }

  return getFieldMeta(field.type).Icon;
}