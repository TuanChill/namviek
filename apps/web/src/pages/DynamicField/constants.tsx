import {
  Type, Hash, CircleDot, LayoutList, Calendar, User,
  CheckSquare, Paperclip, Link, Mail, Fingerprint,
  Clock, UserCheck, RefreshCw, UserCog,
  Star, Heart, Flag, Tag, Folder, Globe, Phone, Users,
  Bookmark, Code, Database, Zap, Image, MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { FieldType } from './types';

export const OPTION_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6',
  '#ec4899', '#f97316', '#8b5cf6', '#06b6d4',
  '#84cc16', '#ef4444',
];

export const COMPUTED_TYPES: FieldType[] = [
  'id', 'created_time', 'updated_time', 'created_by', 'updated_by',
];

interface FieldMeta {
  type: FieldType;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const FIELD_TYPES: FieldMeta[] = [
  { type: 'text',         label: 'Single line text', Icon: Type },
  { type: 'number',       label: 'Number',           Icon: Hash },
  { type: 'select',       label: 'Single select',    Icon: CircleDot },
  { type: 'multi_select', label: 'Multi select',     Icon: LayoutList },
  { type: 'date',         label: 'Date',             Icon: Calendar },
  { type: 'checkbox',     label: 'Checkbox',         Icon: CheckSquare },
  { type: 'url',          label: 'URL',              Icon: Link },
  { type: 'email',        label: 'Email',            Icon: Mail },
  { type: 'person',       label: 'Person',           Icon: User },
  { type: 'file',         label: 'File',             Icon: Paperclip },
  { type: 'id',           label: 'ID',               Icon: Fingerprint },
  { type: 'created_time', label: 'Created time',     Icon: Clock },
  { type: 'updated_time', label: 'Updated time',     Icon: RefreshCw },
  { type: 'created_by',   label: 'Created by',       Icon: UserCheck },
  { type: 'updated_by',   label: 'Updated by',       Icon: UserCog },
];

export function getFieldMeta(type: FieldType): FieldMeta {
  return FIELD_TYPES.find(f => f.type === type) ?? FIELD_TYPES[0];
}

export const DATE_FORMATS = [
  { value: 'YYYY-MM-DD',  label: 'YYYY-MM-DD (ISO)' },
  { value: 'MM/DD/YYYY',  label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY',  label: 'DD/MM/YYYY (EU)' },
  { value: 'MMM D, YYYY', label: 'Jan 1, 2025' },
] as const;

export const NUMBER_FORMATS = [
  { value: 'number', label: 'Number' },
  { value: 'number_with_separators', label: 'Number with separators' },
  { value: 'percent', label: 'Percent' },
  { value: 'usd', label: 'US Dollar (USD)' },
  { value: 'aud', label: 'Australian dollar (AUD)' },
  { value: 'cad', label: 'Canadian dollar (CAD)' },
  { value: 'sgd', label: 'Singapore dollar (SGD)' },
  { value: 'eur', label: 'Euro (EUR)' },
  { value: 'gbp', label: 'Pound Sterling (GBP)' },
] as const;

export function formatDateValue(raw: string, config?: { dateFormat?: string; includeTime?: boolean }): string {
  try {
    const d = new Date(raw);
    const fmt = config?.dateFormat ?? 'YYYY-MM-DD';
    const pad = (n: number) => String(n).padStart(2, '0');
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let str = '';
    if (fmt === 'YYYY-MM-DD')  str = `${Y}-${M}-${D}`;
    else if (fmt === 'MM/DD/YYYY') str = `${M}/${D}/${Y}`;
    else if (fmt === 'DD/MM/YYYY') str = `${D}/${M}/${Y}`;
    else str = `${months[d.getMonth()]} ${d.getDate()}, ${Y}`;
    if (config?.includeTime) str += ` ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return str;
  } catch {
    return raw;
  }
}

export function formatNumberValue(raw: string | number | null | undefined, config?: Record<string, any>): string {
  if (raw == null || raw === '') return '';
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (isNaN(n)) return String(raw);
  const precision = config?.precision;
  const format = config?.numberFormat ?? 'number_with_separators';

  switch (format) {
    case 'number':
      return precision !== undefined ? n.toFixed(precision) : n.toString();
    case 'number_with_separators':
      return n.toLocaleString(undefined, { minimumFractionDigits: precision ?? 0, maximumFractionDigits: precision ?? 2 });
    case 'percent':
      return precision !== undefined 
        ? `${n.toFixed(precision)}%` 
        : `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
    case 'usd':
    case 'aud':
    case 'cad':
    case 'sgd':
    case 'eur':
    case 'gbp':
      return n.toLocaleString(undefined, { 
        style: 'currency', 
        currency: format.toUpperCase(), 
        minimumFractionDigits: precision ?? 2, 
        maximumFractionDigits: precision ?? 2 
      });
    // Legacy support
    case 'integer':
      return Math.round(n).toLocaleString();
    case 'decimal':
      return n.toLocaleString(undefined, { minimumFractionDigits: precision ?? 0, maximumFractionDigits: precision ?? 2 });
    case 'currency':
      return `${config?.currency ?? '$'}${n.toLocaleString(undefined, { minimumFractionDigits: precision ?? 2, maximumFractionDigits: precision ?? 2 })}`;
    default:
      return n.toLocaleString(undefined, { minimumFractionDigits: precision ?? 0, maximumFractionDigits: precision ?? 2 });
  }
}

// ─── Icon picker options ───────────────────────────────────────────────────────

export const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Type',         Icon: Type },
  { name: 'Hash',         Icon: Hash },
  { name: 'Star',         Icon: Star },
  { name: 'Heart',        Icon: Heart },
  { name: 'Flag',         Icon: Flag },
  { name: 'Tag',          Icon: Tag },
  { name: 'Folder',       Icon: Folder },
  { name: 'Link',         Icon: Link },
  { name: 'Globe',        Icon: Globe },
  { name: 'Mail',         Icon: Mail },
  { name: 'Phone',        Icon: Phone },
  { name: 'User',         Icon: User },
  { name: 'Users',        Icon: Users },
  { name: 'Calendar',     Icon: Calendar },
  { name: 'Clock',        Icon: Clock },
  { name: 'Bookmark',     Icon: Bookmark },
  { name: 'Code',         Icon: Code },
  { name: 'Database',     Icon: Database },
  { name: 'Zap',          Icon: Zap },
  { name: 'Image',        Icon: Image },
  { name: 'MessageSquare',Icon: MessageSquare },
  { name: 'CheckSquare',  Icon: CheckSquare },
  { name: 'Paperclip',    Icon: Paperclip },
  { name: 'CircleDot',    Icon: CircleDot },
];

const ICON_MAP = new Map(ICON_OPTIONS.map(o => [o.name, o.Icon]));

export function getIconByName(name: string): LucideIcon {
  return ICON_MAP.get(name) ?? Type;
}
