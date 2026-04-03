import { useState, useEffect } from 'react';
import { initDatabase } from '../database';

export function useDatabase() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
  }, []);

  return { ready, error };
}
