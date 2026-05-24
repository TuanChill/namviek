import type { DynDatabase, DynRecord, DynUser, DynView, DynViewType, Field, FieldOption, FieldValue, FieldValuePayload, FileAttachment, ViewConfig } from './types';
import type { FieldType } from './types';

export interface TemplateField {
  name: string;
  type: FieldType;
  fakerRule: string;
  options?: string[];
}

export interface Template {
  id: string;
  category: string;
  name: string;
  icon?: string;
  description: string;
  fields: TemplateField[];
}

export interface RecordsPage {
  items: DynRecord[];
  hasMore: boolean;
  nextCursor: string | null;
  total: number;
}

const BASE = '/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  databases: {
    list: () => apiFetch<DynDatabase[]>('/databases'),
    create: (name: string, icon?: string) => apiFetch<DynDatabase>('/databases', { method: 'POST', body: JSON.stringify({ name, icon }) }),
    delete: (id: string) => apiFetch<{ success: boolean }>(`/databases/${id}`, { method: 'DELETE' }),
  },
  templates: {
    list: () => apiFetch<Template[]>('/templates'),
    createDatabase: (templateId: string, name?: string, icon?: string) => apiFetch<DynDatabase>('/databases/from-template', { method: 'POST', body: JSON.stringify({ templateId, name, icon }) })
  },
  fields: {
    list: (dbId: string) => apiFetch<Field[]>(`/databases/${dbId}/fields`),
    create: (dbId: string, name: string, type: FieldType, config?: object) =>
      apiFetch<Field>(`/databases/${dbId}/fields`, { method: 'POST', body: JSON.stringify({ name, type, config }) }),
    update: (fieldId: string, data: { name?: string; config?: object }) =>
      apiFetch<Field>(`/fields/${fieldId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (fieldId: string, databaseId: string) =>
      apiFetch(`/fields/${fieldId}?databaseId=${databaseId}`, { method: 'DELETE' }),
    move: (fieldId: string, databaseId: string, direction: 'left' | 'right') =>
      apiFetch(`/fields/${fieldId}/move`, { method: 'POST', body: JSON.stringify({ direction, databaseId }) }),
    duplicate: (fieldId: string) =>
      apiFetch<Field>(`/fields/${fieldId}/duplicate`, { method: 'POST' }),
    backfill: (fieldId: string, databaseId: string) =>
      apiFetch<{ backfilled: number }>(`/fields/${fieldId}/backfill`, { method: 'POST', body: JSON.stringify({ databaseId }) }),
  },
  records: {
    list: (dbId: string, viewId?: string) => apiFetch<DynRecord[]>(`/databases/${dbId}/records${viewId ? `?viewId=${encodeURIComponent(viewId)}` : ''}`),
    listPage: (dbId: string, options?: { viewId?: string; cursor?: string | null; limit?: number }) => {
      const params = new URLSearchParams();
      if (options?.viewId) params.set('viewId', options.viewId);
      if (options?.cursor) params.set('cursor', options.cursor);
      if (options?.limit) params.set('limit', String(options.limit));
      const qs = params.toString();
      return apiFetch<RecordsPage>(`/databases/${dbId}/records/page${qs ? `?${qs}` : ''}`);
    },
    listKanbanGroupPage: (dbId: string, options: { viewId?: string; groupFieldId: string; groupKey: string; cursor?: string | null; limit?: number }) => {
      const params = new URLSearchParams({
        groupFieldId: options.groupFieldId,
        groupKey: options.groupKey,
      });
      if (options.viewId) params.set('viewId', options.viewId);
      if (options.cursor) params.set('cursor', options.cursor);
      if (options.limit) params.set('limit', String(options.limit));
      return apiFetch<RecordsPage>(`/databases/${dbId}/records/kanban-page?${params.toString()}`);
    },
    groupCounts: (dbId: string, fieldId: string, fieldType: 'select' | 'multi_select', viewId?: string) => {
      const params = new URLSearchParams({ fieldId, fieldType });
      if (viewId) params.set('viewId', viewId);
      return apiFetch<Record<string, number>>(`/databases/${dbId}/records/group-counts?${params.toString()}`);
    },
    listFiltered: (dbId: string, filter: any) => apiFetch<DynRecord[]>(`/databases/${dbId}/records/filter`, { method: 'POST', body: JSON.stringify({ filter }) }),
    create: (dbId: string) => apiFetch<DynRecord>(`/databases/${dbId}/records`, { method: 'POST' }),
    delete: (dbId: string, ids: string[]) => apiFetch(`/records`, { method: 'DELETE', body: JSON.stringify({ ids, databaseId: dbId }) }),
    moveKanban: (recordId: string, payload: {
      databaseId: string;
      viewId: string;
      groupFieldId: string;
      toGroupKey: string;
      beforeRecordId?: string | null;
      afterRecordId?: string | null;
    }) => apiFetch<DynRecord>(`/records/${recordId}/move-kanban`, { method: 'POST', body: JSON.stringify(payload) }),
  },
  values: {
    set: (dbId: string, recordId: string, fieldId: string, payload: FieldValuePayload) =>
      apiFetch<FieldValue>(`/records/${recordId}/values/${fieldId}`, { method: 'PUT', body: JSON.stringify({ ...payload, databaseId: dbId }) }),
  },
  options: {
    list: (fieldId: string) => apiFetch<FieldOption[]>(`/fields/${fieldId}/options`),
    create: (fieldId: string, label: string, color: string, position?: number) =>
      apiFetch<FieldOption>(`/fields/${fieldId}/options`, { method: 'POST', body: JSON.stringify({ label, color, position }) }),
    update: (fieldId: string, optionId: string, data: { label?: string; color?: string | null; position?: number }) =>
      apiFetch<FieldOption>(`/fields/${fieldId}/options/${optionId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (fieldId: string, optionId: string) =>
      apiFetch(`/fields/${fieldId}/options/${optionId}`, { method: 'DELETE' }),
  },
  users: {
    list: () => apiFetch<DynUser[]>('/users'),
    search: (q: string) => apiFetch<DynUser[]>(`/users?q=${encodeURIComponent(q)}`),
  },
  views: {
    list: (dbId: string) => apiFetch<DynView[]>(`/databases/${dbId}/views`),
    create: (dbId: string, name: string, type: DynViewType, options?: { icon?: string; config?: ViewConfig }) =>
      apiFetch<DynView>(`/databases/${dbId}/views`, { method: 'POST', body: JSON.stringify({ name, type, ...options }) }),
    update: (viewId: string, patch: { name?: string; icon?: string | null; config?: ViewConfig }) =>
      apiFetch<DynView>(`/views/${viewId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    delete: (viewId: string) => apiFetch<DynView>(`/views/${viewId}`, { method: 'DELETE' }),
    setDefault: (dbId: string, viewId: string) =>
      apiFetch<{ success: boolean }>(`/databases/${dbId}/views/${viewId}/default`, { method: 'POST' }),
    reorder: (dbId: string, viewIds: string[]) =>
      apiFetch<{ success: boolean }>(`/databases/${dbId}/views/reorder`, { method: 'POST', body: JSON.stringify({ viewIds }) }),
  },
  upload: {
    file: async (file: File): Promise<FileAttachment> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<FileAttachment>;
    },
    delete: async (url: string): Promise<void> => {
      const res = await fetch(`${BASE}/upload?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
    },
  },
};

