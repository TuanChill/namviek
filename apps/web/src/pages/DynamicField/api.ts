import type { DynDatabase, DynRecord, DynUser, Field, FieldOption, FieldValue, FieldValuePayload } from './types';
import type { FieldType } from './types';

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
  },
  fields: {
    list: (dbId: string) => apiFetch<Field[]>(`/databases/${dbId}/fields`),
    create: (dbId: string, name: string, type: FieldType, config?: object) =>
      apiFetch<Field>(`/databases/${dbId}/fields`, { method: 'POST', body: JSON.stringify({ name, type, config }) }),
    update: (fieldId: string, data: { name?: string; config?: object }) =>
      apiFetch<Field>(`/fields/${fieldId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (fieldId: string) =>
      apiFetch(`/fields/${fieldId}`, { method: 'DELETE' }),
    move: (fieldId: string, direction: 'left' | 'right') =>
      apiFetch(`/fields/${fieldId}/move`, { method: 'POST', body: JSON.stringify({ direction }) }),
    duplicate: (fieldId: string) =>
      apiFetch<Field>(`/fields/${fieldId}/duplicate`, { method: 'POST' }),
    backfill: (fieldId: string, databaseId: string) =>
      apiFetch<{ backfilled: number }>(`/fields/${fieldId}/backfill`, { method: 'POST', body: JSON.stringify({ databaseId }) }),
  },
  records: {
    list: (dbId: string) => apiFetch<DynRecord[]>(`/databases/${dbId}/records`),
    create: (dbId: string) => apiFetch<DynRecord>(`/databases/${dbId}/records`, { method: 'POST' }),
  },
  values: {
    set: (recordId: string, fieldId: string, payload: FieldValuePayload) =>
      apiFetch<FieldValue>(`/records/${recordId}/values/${fieldId}`, { method: 'PUT', body: JSON.stringify(payload) }),
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
};
