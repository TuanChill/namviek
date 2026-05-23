import { Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Button } from '@/components/ui/button';
import { KanbanCard } from './KanbanCard';
import type { DynRecord, DynView, Field, FieldValuePayload } from '../../types';

export interface KanbanColumnData {
  key: string;
  label: string;
  color?: string | null;
  records: DynRecord[];
}

interface KanbanColumnProps {
  col: KanbanColumnData;
  fields: Field[];
  view: DynView;
  onSetValue: (record: DynRecord, field: Field, payload: FieldValuePayload) => void;
  onAddRecord: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: (columnKey: string) => void;
  totalCount: number;
}

export function KanbanColumn({ col, fields, view, onSetValue, onAddRecord, hasMore, loadingMore, onLoadMore, totalCount }: KanbanColumnProps) {
  const scrollerRef = useRef<HTMLElement | null>(null);
  const scrollListenerRef = useRef<(() => void) | null>(null);
  const loadTriggeredRef = useRef(false);

  useEffect(() => {
    if (!loadingMore) {
      loadTriggeredRef.current = false;
    }
  }, [loadingMore]);

  const checkLoadThreshold = useCallback((element: HTMLElement) => {
    if (!hasMore || loadingMore || loadTriggeredRef.current) {
      return;
    }

    const threshold = element.scrollHeight * 0.8;
    const currentPosition = element.scrollTop + element.clientHeight;

    if (currentPosition >= threshold) {
      loadTriggeredRef.current = true;
      onLoadMore(col.key);
    }
  }, [col.key, hasMore, loadingMore, onLoadMore]);

  const handleScrollerRef = useCallback((element: HTMLElement | Window | null) => {
    if (scrollerRef.current && scrollListenerRef.current) {
      scrollerRef.current.removeEventListener('scroll', scrollListenerRef.current);
    }

    scrollerRef.current = element instanceof HTMLElement ? element : null;

    if (!(element instanceof HTMLElement)) {
      scrollListenerRef.current = null;
      return;
    }

    const listener = () => checkLoadThreshold(element);
    scrollListenerRef.current = listener;
    element.addEventListener('scroll', listener, { passive: true });
  }, [checkLoadThreshold]);

  useEffect(() => {
    return () => {
      if (scrollerRef.current && scrollListenerRef.current) {
        scrollerRef.current.removeEventListener('scroll', scrollListenerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="flex h-full min-h-0 min-w-[300px] max-w-[300px] flex-col gap-2 bg-accent pt-3 rounded-lg"
    >
      {/* Column header */}
      <div className="flex items-center gap-3 pl-3 pr-3">
        {col.color && (
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: col.color }}
          />
        )}
        <span className="text-sm font-semibold truncate flex-1">{col.label}</span>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {totalCount}
        </span>
      </div>

      {/* Cards */}
      <div className="min-h-0 h-full flex-1 px-1">
        <Virtuoso
          style={{ height: '100%' }}
          totalCount={col.records.length}
          scrollerRef={handleScrollerRef}
          itemContent={(index) => {
            const record = col.records[index];
            if (!record) return null;
            return (
              <div className="pb-2 pl-2 pr-2">
                <KanbanCard
                  key={record.id}
                  record={record}
                  fields={fields}
                  view={view}
                  onSetValue={onSetValue}
                />
              </div>
            );
          }}
          components={{
            Footer: () => loadingMore ? (
              <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Loading more...
              </div>
            ) : null,
          }}
        />
      </div>

      {/* Add record */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-xs text-muted-foreground"
        onClick={onAddRecord}
      >
        <Plus size={13} className="mr-1" /> Add record
      </Button>
    </div>
  );
}
