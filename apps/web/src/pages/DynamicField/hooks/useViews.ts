import { useState, useCallback } from 'react';
import { api } from '../api';
import type { DynView, DynViewType, ViewConfig } from '../types';

export function useViews() {
  const [views, setViews] = useState<DynView[]>([]);
  const [activeView, setActiveView] = useState<DynView | null>(null);

  const loadViews = useCallback(async (databaseId: string) => {
    const data = await api.views.list(databaseId);
    setViews(data);
    // Set active to current default or first
    const def = data.find(v => v.isDefault) ?? data[0] ?? null;
    setActiveView(prev => {
      // Keep previously active view if it still exists
      if (prev && data.some(v => v.id === prev.id)) {
        return data.find(v => v.id === prev.id) ?? def;
      }
      return def;
    });
    return data;
  }, []);

  const createView = useCallback(async (databaseId: string, name: string, type: DynViewType, options?: { icon?: string; config?: ViewConfig }) => {
    const view = await api.views.create(databaseId, name, type, options);
    setViews(prev => [...prev, view].sort((a, b) => a.position - b.position));
    return view;
  }, []);

  const updateView = useCallback(async (viewId: string, patch: { name?: string; icon?: string | null; config?: ViewConfig }) => {
    const updated = await api.views.update(viewId, patch);
    setViews(prev => prev.map(v => v.id === viewId ? updated : v));
    setActiveView(prev => prev?.id === viewId ? updated : prev);
    return updated;
  }, []);

  const deleteView = useCallback(async (viewId: string) => {
    await api.views.delete(viewId);
    setViews(prev => {
      const next = prev.filter(v => v.id !== viewId);
      return next;
    });
    setActiveView(prev => {
      if (prev?.id !== viewId) return prev;
      // Switch to default or first remaining
      return views.find(v => v.id !== viewId && v.isDefault) ?? views.find(v => v.id !== viewId) ?? null;
    });
  }, [views]);

  const setDefaultView = useCallback(async (databaseId: string, viewId: string) => {
    await api.views.setDefault(databaseId, viewId);
    setViews(prev => prev.map(v => ({ ...v, isDefault: v.id === viewId })));
  }, []);

  const reorderViews = useCallback(async (databaseId: string, orderedIds: string[]) => {
    await api.views.reorder(databaseId, orderedIds);
    setViews(prev => {
      const byId = Object.fromEntries(prev.map(v => [v.id, v]));
      return orderedIds.map((id, idx) => ({ ...byId[id], position: idx })).filter(Boolean);
    });
  }, []);

  const moveView = useCallback(async (viewId: string, direction: 'left' | 'right') => {
    setViews(prev => {
      const idx = prev.findIndex(v => v.id === viewId);
      if (idx === -1) return prev;
      const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      const orderedIds = next.map(v => v.id);
      // fire-and-forget reorder to server
      const dbId = next[0]?.databaseId;
      if (dbId) api.views.reorder(dbId, orderedIds).catch(console.error);
      return next.map((v, i) => ({ ...v, position: i }));
    });
  }, []);

  return {
    views,
    setViews,
    activeView,
    setActiveView,
    loadViews,
    createView,
    updateView,
    deleteView,
    setDefaultView,
    reorderViews,
    moveView,
  };
}
