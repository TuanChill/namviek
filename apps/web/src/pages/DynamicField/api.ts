import type { DynDatabase, DynRecord, DynUser, Field, FieldOption, FieldValue, FieldValuePayload, FileAttachment } from './types';
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
  description: string;
  fields: TemplateField[];
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
    create: (name: string) => apiFetch<DynDatabase>('/databases', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: string) => apiFetch<{ success: boolean }>(`/databases/${id}`, { method: 'DELETE' }),
  },
  templates: {
    list: () => apiFetch<Template[]>('/templates'),
    createDatabase: (templateId: string, name?: string) => apiFetch<DynDatabase>('/databases/from-template', { method: 'POST', body: JSON.stringify({ templateId, name }) })
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
    list: (dbId: string) => apiFetch<DynRecord[]>(`/databases/${dbId}/records`),
    create: (dbId: string) => apiFetch<DynRecord>(`/databases/${dbId}/records`, { method: 'POST' }),
    delete: (dbId: string, ids: string[]) => apiFetch(`/records`, { method: 'DELETE', body: JSON.stringify({ ids, databaseId: dbId }) }),
  },
  values: {
    set: (dbId: string, recordId: string, fieldId: string, payload: FieldValuePayload) =>
      apiFetch<FieldValue>(`/records/${recordId}/values/${fieldId}`, { method: 'PUT', body: JSON.stringify({ ...payload, databaseId: dbId }) }),
  },
  options: {
    list: (fieldId: string) => apiFetch<FieldOption[]>(`/fields/${fieldId}/options`),
    create: (fieldId: string, label: string, color: string) =>
      apiFetch<FieldOption>(`/fields/${fieldId}/options`, { method: 'POST', body: JSON.stringify({ label, color }) }),
    delete: (fieldId: string, optionId: string) =>
      apiFetch(`/fields/${fieldId}/options/${optionId}`, { method: 'DELETE' }),
  },
  users: {
    list: () => apiFetch<DynUser[]>('/users'),
    search: (q: string) => apiFetch<DynUser[]>(`/users?q=${encodeURIComponent(q)}`),
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

