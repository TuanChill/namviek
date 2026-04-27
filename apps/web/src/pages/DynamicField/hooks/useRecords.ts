import { useState, useCallback } from 'react';
import { api } from '../api';
import type { DynRecord, Field, FieldValue, FieldValuePayload } from '../types';

export function useRecords() {
  const [records, setRecords] = useState<DynRecord[]>([]);

  const loadRecords = useCallback(async (dbId: string) => {
    const r = await api.records.list(dbId);
    setRecords(r);
    return r;
  }, []);

  /** Add a new empty record and auto-fill id-type fields */
  const addRecord = useCallback(async (dbId: string, idFields: Field[]) => {
    const record = await api.records.create(dbId);
    let fieldValues: FieldValue[] = [];

    // For each id-type field, immediately write rowNumber as textValue
    if (idFields.length > 0) {
      const results = await Promise.all(
        idFields.map(f => api.values.set(dbId, record.id, f.id, { textValue: String(record.rowNumber) }))
      );
      fieldValues = results.map((fv, i) => ({ ...fv, field: idFields[i] }));
    }

    setRecords(prev => {
      if (prev.some(r => r.id === record.id)) {
        return prev.map(r => r.id === record.id ? { ...record, fieldValues } : r);
      }
      return [...prev, { ...record, fieldValues }];
    });
    return record;
  }, []);

  const setValue = useCallback(async (dbId: string, record: DynRecord, field: Field, payload: FieldValuePayload) => {
    const saved = await api.values.set(dbId, record.id, field.id, payload);
    setRecords(prev => prev.map(r => {
      if (r.id !== record.id) return r;
      const exists = r.fieldValues.find(fv => fv.fieldId === field.id);
      if (exists) return { ...r, fieldValues: r.fieldValues.map(fv => fv.fieldId === field.id ? { ...fv, ...saved } : fv) };
      return { ...r, fieldValues: [...r.fieldValues, { ...saved, field }] };
    }));
  }, []);

  const removeFieldValues = useCallback((fieldId: string) => {
    setRecords(prev => prev.map(r => ({ ...r, fieldValues: r.fieldValues.filter(fv => fv.fieldId !== fieldId) })));
  }, []);

  const deleteRecords = useCallback(async (dbId: string, recordIds: string[]) => {
    await api.records.delete(dbId, recordIds);
    setRecords(prev => prev.filter(r => !recordIds.includes(r.id)));
  }, []);

  /** After a backfill, reload records from server */
  const reloadRecords = useCallback(async (dbId: string) => {
    const r = await api.records.list(dbId);
    setRecords(r);
  }, []);

  return { records, setRecords, loadRecords, addRecord, setValue, removeFieldValues, reloadRecords, deleteRecords };
}
