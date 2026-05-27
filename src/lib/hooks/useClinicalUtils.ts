import { useI18n } from '../i18n';

export function useClinicalUtils() {
  const { t } = useI18n();

  const getPriorityLabel = (priority: string) => {
    const p = (priority || '').toUpperCase();
    if (p === 'NORMAL' || p === 'ROUTINE') return t('wh_priority_routine') || 'Routine';
    if (p === 'HIGH') return t('wh_priority_high') || 'High';
    if (p === 'URGENT') return t('wh_priority_urgent') || 'Urgent';
    if (p === 'CRITICAL' || p === 'STAT' || p === 'MTP') return t('wh_priority_critical') || 'Critical';
    return priority;
  };

  const getStatusColor = (status: string) => {
    switch(status.toUpperCase()) {
      case 'AVAILABLE': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'QUARANTINE': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'ALLOCATED': return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
      case 'ISSUED': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'TRANSFUSED': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'WASTED': return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
      default: return 'text-clinical-muted bg-clinical-card border-clinical-border';
    }
  };

  return { getPriorityLabel, getStatusColor };
}
