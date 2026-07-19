import { useState, useEffect } from 'react';

export function useAuth() {
  const [identity, setIdentity] = useState<string | null>(null);
  const [identityChangeCount, setIdentityChangeCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('babysplitter_identity');
    if (saved) setIdentity(saved);
    const count = localStorage.getItem('babysplitter_identity_change_count');
    if (count) setIdentityChangeCount(Number(count));
    setLoading(false);
  }, []);

  const login = (name: string) => {
    localStorage.setItem('babysplitter_identity', name);
    setIdentity(name);
  };

  const changeIdentity = (name: string) => {
    if (identityChangeCount >= 1) return false;
    localStorage.setItem('babysplitter_identity', name);
    localStorage.setItem('babysplitter_identity_change_count', '1');
    setIdentity(name);
    setIdentityChangeCount(1);
    return true;
  };

  const canChangeIdentity = identityChangeCount < 1;

  return { identity, login, changeIdentity, canChangeIdentity, loading };
}
