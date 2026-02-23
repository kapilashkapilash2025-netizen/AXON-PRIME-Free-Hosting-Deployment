'use client';

export default function NotificationStack({ items = [], onDismiss }) {
  if (!items.length) return null;

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`animate-notifyIn rounded-lg border p-3 shadow-panel backdrop-blur ${
            item.tone === 'danger'
              ? 'border-rose-600/70 bg-rose-950/80 text-rose-200'
              : item.tone === 'warning'
                ? 'border-amber-500/70 bg-amber-950/70 text-amber-200'
                : item.tone === 'success'
                  ? 'border-emerald-600/70 bg-emerald-950/60 text-emerald-200'
                  : 'border-slate-700 bg-navy-950/85 text-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {item.title ? <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{item.title}</div> : null}
              <div className="text-sm">{item.message}</div>
            </div>
            <button className="text-xs opacity-70 hover:opacity-100" onClick={() => onDismiss(item.id)} type="button">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
