import { useState, useCallback, useEffect } from 'react';
import { ScanResult } from '../types';
import { fetchScan } from '../lib/api';

export function useScan() {
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchScan();
      setScan(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { scan, loading, error, refetch };
}
