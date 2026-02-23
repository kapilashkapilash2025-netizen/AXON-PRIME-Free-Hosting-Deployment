export default function PlanBadge({ role }) {
  const classes = {
    FREE: 'bg-slate-700 text-slate-200',
    PRO: 'bg-skyaccent-600 text-white',
    ELITE: 'bg-emerald-600 text-white',
    FOUNDER: 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
  };

  const label = role === 'FOUNDER' ? 'Founder Mode' : role;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[role] || classes.FREE}`}>{label}</span>;
}
