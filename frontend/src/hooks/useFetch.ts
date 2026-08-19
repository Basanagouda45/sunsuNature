import { useCallback, useEffect, useState } from 'react';
import { api } from '@/src/api/client';

export function useFetch<T>(path: string | null, auth = false, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(path, auth);
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, auth]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps.length ? deps : [path]);

  return { data, loading, error, reload: load, setData };
}
