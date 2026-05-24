import type { DragEvent, ReactNode } from 'react';

interface KanbanCardDraggableProps {
  recordId: string;
  isDragging: boolean;
  onDragStart: (recordId: string, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (recordId: string, event: DragEvent<HTMLDivElement>) => void;
  onDrop: (recordId: string, event: DragEvent<HTMLDivElement>) => void;
  children: ReactNode;
}

export function KanbanCardDraggable({
  recordId,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  children,
}: KanbanCardDraggableProps) {
  return (
    <div
      data-kanban-record-id={recordId}
      draggable
      onDragStart={(event) => onDragStart(recordId, event)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onDragOver(recordId, event)}
      onDrop={(event) => onDrop(recordId, event)}
      className={isDragging ? 'opacity-50 cursor-grabbing' : ''}
    >
      {children}
    </div>
  );
}
