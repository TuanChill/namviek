import { useState, useEffect, useRef } from 'react';
import { Check, X, Search, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { api } from '../api';
import type { DynUser, Field, FieldValue, FieldValuePayload } from '../types';

// ─── Avatar ──────────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 22 }: { user: DynUser; size?: number }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
  const color = colors[user.name.charCodeAt(0) % colors.length];
  return (
    <span
      style={{ width: size, height: size, background: `${color}22`, color, border: `1px solid ${color}44`, fontSize: size * 0.4 }}
      className="rounded-full flex items-center justify-center font-semibold shrink-0"
    >
      {initials}
    </span>
  );
}

// ─── Person chip (display in cell) ───────────────────────────────────────────

export function PersonChip({ user }: { user: DynUser }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-xs font-medium whitespace-nowrap">
      <UserAvatar user={user} size={14} />
      {user.name}
    </span>
  );
}

// ─── PersonCell ───────────────────────────────────────────────────────────────

interface CellProps {
  field: Field;
  value?: FieldValue;
  onSave: (p: FieldValuePayload) => void;
}

export function PersonCell({ field, value, onSave }: CellProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<DynUser[]>([]);
  const [filtered, setFiltered] = useState<DynUser[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const allowMultiple = field.config?.allowMultiple ?? false;
  const selectedIds = value?.personValue ?? [];

  // Load all users once on mount
  useEffect(() => {
    api.users.list().then(users => {
      setAllUsers(users);
      setFiltered(users);
    }).catch(console.error);
  }, []);

  // Client-side filter (fast), debounce server search for large datasets
  useEffect(() => {
    const q = query.toLowerCase();
    if (!q) {
      setFiltered(allUsers);
    } else {
      setFiltered(allUsers.filter(u =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      ));
    }
  }, [query, allUsers]);

  const toggle = (userId: string) => {
    let next: string[];
    if (allowMultiple) {
      next = selectedIds.includes(userId)
        ? selectedIds.filter(id => id !== userId)
        : [...selectedIds, userId];
    } else {
      next = selectedIds.includes(userId) ? [] : [userId];
      setOpen(false);
    }
    onSave({ personValue: next });
  };

  const selectedUsers = selectedIds
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean) as DynUser[];

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); if (v) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); } }}>
      <PopoverTrigger asChild>
        <button className="w-full text-left min-h-5">
          {selectedUsers.length === 0 ? (
            <span className="text-muted-foreground/40 text-sm flex items-center gap-1">
              <User size={12} /> —
            </span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {selectedUsers.map(u => <PersonChip key={u.id} user={u} />)}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 flex flex-col gap-2" align="start">
        {/* Search bar */}
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-7 h-8 text-xs"
          />
        </div>

        {/* Clear selection */}
        {selectedIds.length > 0 && (
          <button
            onClick={() => { onSave({ personValue: [] }); setOpen(false); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-1 py-0.5"
          >
            <X size={11} /> Clear
          </button>
        )}

        {/* User list */}
        <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No users found</p>
          ) : (
            filtered.map(user => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggle(user.id)}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-left hover:bg-accent transition-colors ${isSelected ? 'bg-accent/50' : ''}`}
                >
                  <UserAvatar user={user} size={24} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{user.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                  </div>
                  {isSelected && <Check size={13} className="text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
