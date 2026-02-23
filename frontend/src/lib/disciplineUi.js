export function getDisciplinePresentation(score, status) {
  if (status === 'INSUFFICIENT_DATA' || score == null) {
    return {
      color: '#94a3b8',
      label: 'Insufficient Data',
      subtitle: 'Not enough trading data yet'
    };
  }

  if (score >= 90) {
    return { color: '#22c55e', label: 'Elite Discipline', subtitle: 'Strong behavioral control and rule consistency' };
  }
  if (score >= 75) {
    return { color: '#84cc16', label: 'Strong Discipline', subtitle: 'Good adherence with manageable risk behavior' };
  }
  if (score >= 60) {
    return { color: '#f59e0b', label: 'Needs Attention', subtitle: 'Behavior drift detected. Tighten process discipline' };
  }
  return { color: '#ef4444', label: 'High Behavioral Risk', subtitle: 'Trading discipline is deteriorating. Review your risk plan' };
}
