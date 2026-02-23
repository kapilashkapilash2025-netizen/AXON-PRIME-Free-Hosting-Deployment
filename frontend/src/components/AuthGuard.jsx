'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/auth';

export default function AuthGuard({ children }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="p-8 text-slate-400">Checking session...</div>;
  }

  return children;
}
