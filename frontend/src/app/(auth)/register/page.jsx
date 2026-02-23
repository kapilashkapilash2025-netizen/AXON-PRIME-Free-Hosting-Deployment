'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', accountBalance: '10000' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      setMessage(data.message);
    } catch {
      setError('Unable to create account. Please verify form details and retry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-md p-6">
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <p className="mt-1 text-sm text-slate-400">Start with a capital protection workflow.</p>
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <input className="input" placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="input" placeholder="Starting Balance" value={form.accountBalance} onChange={(e) => setForm({ ...form, accountBalance: e.target.value })} />
          <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        {message ? <p className="mt-3 text-sm text-emerald-400">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
        <p className="mt-4 text-sm text-slate-400">Already registered? <a className="text-skyaccent-400" href="/login">Sign in</a></p>
      </div>
    </main>
  );
}
