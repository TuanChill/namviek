import { useState, useCallback } from 'react';
import { api } from '../api';
import type { Field, FieldConfig, FieldType } from '../types';

export function useFields() {
  const [fields, setFields] = useState<Field[]>([]);

  const loadFields = useCallback(async (dbId: string) => {
    const f = await api.fields.list(dbId);
    setFields(f);
    return f;
  }, []);

  const addField = useCallback(async (
    dbId: string,
    name: string,
    type: FieldType,
    config: FieldConfig,
    pendingOptions: { label: string; color: string }[]
  ) => {
    const field = await api.fields.create(dbId, name, type, config);
    const opts = await Promise.all(pendingOptions.map(o => api.options.create(field.id, o.label, o.color)));
    const newField = { ...field, options: opts, config: config as Field['config'] };

    // Auto-backfill id fields immediately
    if (type === 'id') {
      await api.fields.backfill(field.id, dbId);
    }

    setFields(prev => [...prev, newField]);
    return newField;
  }, []);

  const renameField = useCallback(async (fieldId: string, name: string) => {
    const updated = await api.fields.update(fieldId, { name });
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, name: updated.name } : f));
    return updated;
  }, []);

  const deleteField = useCallback(async (fieldId: string, dbId: string) => {
    await api.fields.delete(fieldId, dbId);
    setFields(prev => prev.filter(f => f.id !== fieldId));
  }, []);

  const moveField = useCallback(async (fieldId: string, direction: 'left' | 'right', dbId: string) => {
    await api.fields.move(fieldId, dbId, direction);
    const f = await api.fields.list(dbId);
    setFields(f);
  }, []);

  const duplicateField = useCallback(async (fieldId: string, dbId: string) => {
    await api.fields.duplicate(fieldId);
    const f = await api.fields.list(dbId);
    setFields(f);
  }, []);

  const changeIcon = useCallback(async (fieldId: string, iconName: string, currentConfig: FieldConfig | null | undefined) => {
    const updated = await api.fields.update(fieldId, { config: { ...(currentConfig ?? {}), customIcon: iconName } });
    setFields(prev => prev.map(f => f.id === fieldId ? { ...f, config: updated.config } : f));
  }, []);

  const updateField = useCallback((updated: Field) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
  }, []);

  return {
    fields,
    setFields,
    loadFields,
    addField,
    renameField,
    deleteField,
    moveField,
    duplicateField,
    changeIcon,
    updateField,
  };
}
