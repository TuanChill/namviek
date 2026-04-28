import { useState, useEffect } from 'react';
import { api } from '../api';
import type { DynUser } from '../types';

// Module-level cache to share data across all component instances
let cachedUsers: DynUser[] | null = null;
let pendingRequest: Promise<DynUser[]> | null = null;

/**
 * Hook to fetch and cache users for the Dynamic Field system.
 * Prevents multiple concurrent API calls when many PersonCells are mounted.
 */
export function useUsers() {
  const [users, setUsers] = useState<DynUser[]>(cachedUsers || []);
  const [loading, setLoading] = useState(!cachedUsers);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If we already have data, just stop loading
    if (cachedUsers) {
      setUsers(cachedUsers);
      setLoading(false);
      return;
    }

    // If a request is already in flight, wait for it
    if (!pendingRequest) {
      pendingRequest = api.users.list()
        .then(data => {
          cachedUsers = data;
          return data;
        })
        .finally(() => {
          pendingRequest = null;
        });
    }

    pendingRequest
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, []);

  return { users, loading, error };
}
