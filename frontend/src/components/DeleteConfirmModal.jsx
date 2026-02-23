'use client';

export default function DeleteConfirmModal({ open, title, message, loading, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="panel w-full max-w-md p-5">
        <h3 className="text-lg font-semibold text-rose-300">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-muted" type="button" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-60" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
