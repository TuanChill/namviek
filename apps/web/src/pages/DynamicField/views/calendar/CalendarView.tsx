import { CalendarDays } from 'lucide-react';

export function CalendarView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground p-8">
      <CalendarDays size={48} className="opacity-20" />
      <p className="text-base font-semibold">Calendar view</p>
      <p className="text-sm text-center">Coming soon — full calendar business logic is not implemented yet.</p>
    </div>
  );
}
