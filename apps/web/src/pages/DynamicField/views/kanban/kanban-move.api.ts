import { api } from '../../api';
import type { DynRecord } from '../../types';

export interface MoveKanbanRecordPayload {
  databaseId: string;
  viewId: string;
  groupFieldId: string;
  toGroupKey: string;
  beforeRecordId?: string | null;
  afterRecordId?: string | null;
}

export function moveKanbanRecord(recordId: string, payload: MoveKanbanRecordPayload): Promise<DynRecord> {
  return api.records.moveKanban(recordId, payload);
}
