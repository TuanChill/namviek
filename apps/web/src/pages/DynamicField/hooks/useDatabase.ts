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

  return { databases, selectedDb, setSelectedDb, createDatabase, selectDatabase };
}
