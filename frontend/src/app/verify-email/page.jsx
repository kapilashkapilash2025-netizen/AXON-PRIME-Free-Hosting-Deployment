'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '../../lib/api';

export default function VerifyPage() {
  const [status, setStatus] = useState('Verifying...');
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('Missing token');
      return;
    }

    apiFetch(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('Email verified. You can now login.'))
      .catch(() => setStatus('Verification link is invalid or expired.'));
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md p-6 text-center">
        <h1 className="text-xl font-semibold">Email Verification</h1>
        <p className="mt-3 text-slate-300">{status}</p>
        <a className="mt-5 inline-block text-skyaccent-400" href="/login">Go to Login</a>
      </div>
    </main>
  );
}
