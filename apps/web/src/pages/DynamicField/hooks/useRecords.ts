import { useState, useCallback, useRef } from 'react';
import { api } from '../api';
import type { DynRecord, Field, FieldValue, FieldValuePayload } from '../types';

interface AddRecordInitialValue {
  field: Field;
  payload: FieldValuePayload;
}

export function useRecords() {
  const [records, setRecords] = useState<DynRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursorRef = useRef<string | null>(null);
  const currentQueryRef = useRef<{ dbId: string; viewId?: string }>({ dbId: '', viewId: undefined });

  const mergeUniqueRecords = useCallback((prev: DynRecord[], incoming: DynRecord[]) => {
    if (incoming.length === 0) return prev;
    const seen = new Set(prev.map(r => r.id));
    const appended = incoming.filter(r => !seen.has(r.id));
    if (appended.length === 0) return prev;
    return [...prev, ...appended];
  }, []);

  const loadRecords = useCallback(async (
    dbId: string,
    viewId?: string,
    shouldApply: () => boolean = () => true,
  ) => {
    currentQueryRef.current = { dbId, viewId };
    const page = await api.records.listPage(dbId, { viewId, limit: 100 });
    if (shouldApply()) {
      setRecords(page.items);
      setTotalRecords(page.total);
      setHasMore(page.hasMore);
      nextCursorRef.current = page.nextCursor;
    }
    return page.items;
  }, []);

  const loadMoreRecords = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursorRef.current) return;

    const { dbId, viewId } = currentQueryRef.current;
    if (!dbId) return;

    setLoadingMore(true);
    try {
      const page = await api.records.listPage(dbId, {
        viewId,
        cursor: nextCursorRef.current,
        limit: 100,
      });
      setRecords(prev => mergeUniqueRecords(prev, page.items));
      setTotalRecords(page.total);
      setHasMore(page.hasMore);
      nextCursorRef.current = page.nextCursor;
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, mergeUniqueRecords]);

  /** Add a new empty record and auto-fill id-type fields plus optional initial values */
  const addRecord = useCallback(async (dbId: string, idFields: Field[], initialValues: AddRecordInitialValue[] = []) => {
    const record = await api.records.create(dbId);
    let fieldValues: FieldValue[] = [];

    const writes: Array<{ field: Field; payload: FieldValuePayload }> = [
      ...idFields.map(field => ({ field, payload: { textValue: String(record.rowNumber) } })),
      ...initialValues,
    ];

    if (writes.length > 0) {
      const deduped = new Map<string, { field: Field; payload: FieldValuePayload }>();
      for (const write of writes) {
        deduped.set(write.field.id, write);
      }

      const writeList = Array.from(deduped.values());
      const results = await Promise.all(
        writeList.map(write => api.values.set(dbId, record.id, write.field.id, write.payload))
      );
      fieldValues = results.map((fv, i) => ({ ...fv, field: writeList[i].field }));
    }

    setRecords(prev => {
      if (prev.some(r => r.id === record.id)) {
        return prev.map(r => r.id === record.id ? { ...record, fieldValues } : r);
      }
      return [...prev, { ...record, fieldValues }];
    });
    setTotalRecords(prev => prev + 1);
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
    setTotalRecords(prev => Math.max(0, prev - recordIds.length));
  }, []);

  /** After a backfill, reload records from server */
  const reloadRecords = useCallback(async (dbId: string, viewId?: string) => {
    const page = await api.records.listPage(dbId, { viewId, limit: 100 });
    setRecords(page.items);
    setTotalRecords(page.total);
    setHasMore(page.hasMore);
    nextCursorRef.current = page.nextCursor;
    currentQueryRef.current = { dbId, viewId };
  }, []);

  return {
    records,
    setRecords,
    totalRecords,
    setTotalRecords,
    hasMore,
    loadingMore,
    loadRecords,
    loadMoreRecords,
    addRecord,
    setValue,
    removeFieldValues,
    reloadRecords,
    deleteRecords,
  };
}
