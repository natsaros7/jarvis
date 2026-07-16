import { useState, useEffect } from 'react';
import { GitScan } from '../types';
import { fetchGit } from '../lib/api';

export function useGitScan() {
  const [git, setGit] = useState<GitScan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGit()
      .then(setGit)
      .catch(() => setGit({ findings: [], error: 'Git scan failed' }))
      .finally(() => setLoading(false));
  }, []);

  return { git, loading };
}
