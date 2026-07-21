import { useState, useEffect, useCallback } from 'react';
import { GitScan } from '../types';
import { fetchGit } from '../lib/api';

export function useGitScan() {
  const [git, setGit] = useState<GitScan | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback((force = false) => {
    setLoading(true);
    fetchGit(force)
      .then(setGit)
      .catch(() => setGit({ findings: [], error: 'Git scan failed' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(false); }, [refetch]);

  return { git, loading, refetch };
}
