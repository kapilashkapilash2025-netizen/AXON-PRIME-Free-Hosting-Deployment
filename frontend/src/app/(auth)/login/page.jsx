'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { setSession, setUser } from '../../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      setSession(data);
      await apiFetch('/subscriptions/refresh', { method: 'POST' }).catch(() => null);
      const me = await apiFetch('/auth/me');
      setUser(me.user);
      router.push('/dashboard');
    } catch {
      setError('Unable to sign in. Check credentials and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold">AXON PRIME</h1>
        <p className="mt-1 text-sm text-slate-400">Risk Guard Pro Login</p>
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        <p className="mt-4 text-sm text-slate-400">No account? <a className="text-skyaccent-400" href="/register">Create one</a></p>
      </div>
    </main>
  );
}
