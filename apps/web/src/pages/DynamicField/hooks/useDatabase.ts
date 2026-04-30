import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { DynDatabase } from '../types';

export function useDatabase() {
  const [databases, setDatabases] = useState<DynDatabase[]>([]);
  const [selectedDb, setSelectedDb] = useState<DynDatabase | null>(null);

  useEffect(() => {
    api.databases.list().then(setDatabases).catch(console.error);
  }, []);

  const createDatabase = useCallback(async (name: string) => {
    const db = await api.databases.create(name);
    const list = await api.databases.list();
    setDatabases(list);
    return db;
  }, []);

  const selectDatabase = useCallback((db: DynDatabase) => {
    setSelectedDb(db);
  }, []);

  const deleteDatabase = useCallback(async (id: string) => {
    await api.databases.delete(id);
    const list = await api.databases.list();
    setDatabases(list);
    if (selectedDb?.id === id) {
      setSelectedDb(null);
    }
  }, [selectedDb]);

  const upsertDatabase = useCallback((db: DynDatabase) => {
    setDatabases((prev) => {
      const exists = prev.some((item) => item.id === db.id);
      if (exists) {
        return prev.map((item) => (item.id === db.id ? db : item));
      }
      return [...prev, db];
    });
  }, []);

  const removeDatabase = useCallback((id: string) => {
    setDatabases((prev) => prev.filter((db) => db.id !== id));
    setSelectedDb((prev) => (prev?.id === id ? null : prev));
  }, []);

  return {
    databases,
    selectedDb,
    setSelectedDb,
    createDatabase,
    selectDatabase,
    deleteDatabase,
    upsertDatabase,
    removeDatabase,
  };
}
