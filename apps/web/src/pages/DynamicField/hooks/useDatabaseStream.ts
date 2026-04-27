import { useEffect, useRef } from 'react';
import type { DynRecord, Field, FieldValue } from '../types';

interface StreamHandlers {
  onRecordCreated: (record: DynRecord) => void;
  onRecordsDeleted: (ids: string[]) => void;
  onValueUpdated: (value: FieldValue) => void;
  onFieldCreated: (field: Field) => void;
  onFieldDeleted: (id: string) => void;
  onFieldUpdated: (field: Field) => void;
  onFieldsReordered: () => void;
}

export function useDatabaseStream(dbId: string | undefined, handlers: StreamHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!dbId) return;

    const eventSource = new EventSource(`/api/databases/${dbId}/stream`);

    eventSource.addEventListener('RECORD_CREATED', (e) => {
      handlersRef.current.onRecordCreated(JSON.parse(e.data));
    });

    eventSource.addEventListener('RECORDS_DELETED', (e) => {
      const data = JSON.parse(e.data);
      handlersRef.current.onRecordsDeleted(data.ids);
    });

    eventSource.addEventListener('VALUE_UPDATED', (e) => {
      handlersRef.current.onValueUpdated(JSON.parse(e.data));
    });

    eventSource.addEventListener('FIELD_CREATED', (e) => {
      handlersRef.current.onFieldCreated(JSON.parse(e.data));
    });

    eventSource.addEventListener('FIELD_DELETED', (e) => {
      const data = JSON.parse(e.data);
      handlersRef.current.onFieldDeleted(data.id);
    });

    eventSource.addEventListener('FIELD_UPDATED', (e) => {
      handlersRef.current.onFieldUpdated(JSON.parse(e.data));
    });

    eventSource.addEventListener('FIELDS_REORDERED', () => {
      handlersRef.current.onFieldsReordered();
    });

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      // The browser automatically tries to reconnect.
    };

    return () => {
      eventSource.close();
    };
  }, [dbId]); // Re-run if dbId changes, but NOT on every render (handlers are not in deps, we assume they use state setters that are stable or we use a ref if needed. Wait, in React we might need refs for handlers if they change, but since we will pass state setters directly or use functional updates, they should be stable).
}
