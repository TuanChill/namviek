import type { DynRecord } from '../../types';

export interface KanbanDragState {
  recordId: string;
  fromGroupKey: string;
}

export interface KanbanHoverState {
  toGroupKey: string;
  targetRecordId: string | null;
}

export interface KanbanMoveOutcome {
  records: DynRecord[];
  beforeRecordId: string | null;
  afterRecordId: string | null;
}
