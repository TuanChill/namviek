import { Fragment } from 'react';
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getFieldMeta, formatDateValue, formatNumberValue } from '../../constants';
import type {
  DynRecord,
  DynUser,
  DynView,
  Field,
  FieldValue,
} from '../../types';
import type { CardSection } from './kanban-card-layout.utils';
import { getKanbanCardLayout } from './kanban-card-layout.utils';

interface KanbanCardContentProps {
  record: DynRecord;
  fields: Field[];
  view: Pick<DynView, 'config'>;
  users?: DynUser[];
  className?: string;
}

const FALLBACK_USER_PALETTE = ['#0f766e', '#1d4ed8', '#b45309', '#be123c', '#6d28d9'];

export function KanbanCardContent({ record, fields, view, users = [], className }: KanbanCardContentProps) {
  const primaryField = fields.find(field => field.isPrimary) ?? fields[0] ?? null;
  const titleValue = primaryField ? record.fieldValues.find(value => value.fieldId === primaryField.id) : null;
  const title = titleValue?.textValue ?? `Record #${record.rowNumber}`;
  const layout = getKanbanCardLayout(view.config, fields);
  const headerFields = layout.header.map(fieldId => fields.find(field => field.id === fieldId)).filter(Boolean) as Field[];
  const footerFields = layout.footer.map(fieldId => fields.find(field => field.id === fieldId)).filter(Boolean) as Field[];

  return (
    <div className={['bg-card border rounded-lg p-3 shadow-sm transition-shadow', className].filter(Boolean).join(' ')}>
      {headerFields.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
            {headerFields.map(field => {
            const content = renderFieldValue({ field, record, users, section: 'header' });
            if (!content) return null;

            return (
              <Fragment key={field.id}>
                {content}
              </Fragment>
            );
          })}
        </div>
      )}

      <p className="text-sm font-medium leading-5 text-foreground">{title}</p>

      {footerFields.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
            {footerFields.map(field => {
            const content = renderFieldValue({ field, record, users, section: 'footer' });
            if (!content) return null;

            const { Icon } = getFieldMeta(field.type);
            const isSpecialContent = field.type === 'select' || field.type === 'multi_select' || field.type === 'person';

            return (
              <Fragment key={field.id}>
                <div className="flex min-w-0 items-center gap-1.5">
                  {!isSpecialContent && <Icon size={13} className="shrink-0 text-muted-foreground/80" />}
                  <div className="min-w-0">{content}</div>
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderFieldValue({
  field,
  record,
  users,
  section,
}: {
  field: Field;
  record: DynRecord;
  users: DynUser[];
  section: CardSection;
}) {
  const fieldValue = record.fieldValues.find(value => value.fieldId === field.id);

  if (field.type === 'select') {
    const option = field.options.find(item => item.id === fieldValue?.selectValue);
    if (!option) return null;

    return <Badge className="font-medium" style={getBadgeStyle(option.color)}>{option.label}</Badge>;
  }

  if (field.type === 'multi_select') {
    const options = (fieldValue?.multiSelectValue ?? [])
      .map(optionId => field.options.find(option => option.id === optionId))
      .filter(Boolean) as Array<NonNullable<(typeof field.options)[number]>>;
    if (options.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1">
        {options.map(option => (
          <Badge key={option.id} className="font-medium" style={getBadgeStyle(option.color)}>
            {option.label}
          </Badge>
        ))}
      </div>
    );
  }

  if (field.type === 'person') {
    const people = (fieldValue?.personValue ?? [])
      .map(userId => users.find(user => user.id === userId))
      .filter(Boolean) as DynUser[];

    if (people.length === 0) return null;

    return <KanbanAvatarStack users={people} />;
  }

  if (section === 'header') {
    const headerDateValue = getHeaderDateValue(record, field, fieldValue);
    if (headerDateValue) {
      const shortDate = formatKanbanHeaderDate(headerDateValue);
      const fullDate = formatDateValue(headerDateValue, { includeTime: true });

      if (shortDate) {
        return (
          <span className="min-w-0 truncate" title={fullDate}>
            {shortDate}
          </span>
        );
      }
    }
  }

  const text = getFieldTextValue(record, field, fieldValue);
  if (!text) return null;

  if (field.type === 'url') {
    const href = text.startsWith('http://') || text.startsWith('https://') ? text : `https://${text}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 truncate text-primary underline-offset-2 hover:underline"
      >
        {text}
      </a>
    );
  }

  if (field.type === 'email') {
    return (
      <a href={`mailto:${text}`} className="min-w-0 truncate text-primary underline-offset-2 hover:underline">
        {text}
      </a>
    );
  }

  return <span className="min-w-0 truncate">{text}</span>;
}

function getFieldTextValue(record: DynRecord, field: Field, fieldValue?: FieldValue) {
  switch (field.type) {
    case 'text':
      return fieldValue?.textValue ?? null;
    case 'number':
      return formatNumberValue(fieldValue?.numberValue, field.config ?? undefined);
    case 'date':
      return fieldValue?.dateValue ? formatDateValue(fieldValue.dateValue, field.config ?? undefined) : null;
    case 'url':
    case 'email':
      return fieldValue?.textValue ?? null;
    case 'checkbox':
      return fieldValue?.boolValue === true ? 'Checked' : fieldValue?.boolValue === false ? 'Unchecked' : null;
    case 'file': {
      const attachments = Array.isArray(fieldValue?.jsonValue) ? fieldValue.jsonValue : [];
      return attachments.length > 0 ? `${attachments.length} file${attachments.length === 1 ? '' : 's'}` : null;
    }
    case 'created_time':
      return formatDateValue(record.createdAt, {});
    case 'updated_time':
      return formatDateValue(record.updatedAt, {});
    case 'created_by':
    case 'updated_by':
      return 'System';
    default:
      return null;
  }
}

function getHeaderDateValue(record: DynRecord, field: Field, fieldValue?: FieldValue) {
  switch (field.type) {
    case 'date':
      return fieldValue?.dateValue ?? null;
    case 'created_time':
      return record.createdAt;
    case 'updated_time':
      return record.updatedAt;
    default:
      return null;
  }
}

function formatKanbanHeaderDate(raw: string) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${weekday} ${month}/${day}`;
}

function KanbanAvatarStack({ users }: { users: DynUser[] }) {
  const visibleUsers = users.slice(0, 3);
  const hiddenCount = Math.max(0, users.length - visibleUsers.length);

  return (
    <AvatarGroup>
      {visibleUsers.map(user => (
        <Avatar key={user.id} size="sm">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
          <AvatarFallback style={getFallbackAvatarStyle(user.name)}>
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {hiddenCount > 0 && <AvatarGroupCount>+{hiddenCount}</AvatarGroupCount>}
    </AvatarGroup>
  );
}

function getBadgeStyle(color?: string | null) {
  if (!color) return undefined;
  return {
    backgroundColor: `${color}22`,
    borderColor: `${color}44`,
    color,
  };
}

function getFallbackAvatarStyle(name: string) {
  const color = FALLBACK_USER_PALETTE[name.charCodeAt(0) % FALLBACK_USER_PALETTE.length];
  return {
    backgroundColor: `${color}20`,
    color,
  };
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

