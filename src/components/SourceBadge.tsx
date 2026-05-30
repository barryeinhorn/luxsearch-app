import type { SourceStatus } from '../types';

type SourceBadgeProps = {
  source: string;
  sources: SourceStatus[];
};

const sourceStyles: Record<string, string> = {
  athome: 'bg-blue-100 text-blue-800',
  immotop: 'bg-purple-100 text-purple-800',
  remax: 'bg-red-100 text-red-800',
  beckimmo: 'bg-emerald-100 text-emerald-800',
  newimmo: 'bg-orange-100 text-orange-800',
};

const statusColor: Record<string, string> = {
  ok: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  failed: 'bg-rose-500',
};

export function SourceBadge({ source, sources }: SourceBadgeProps) {
  const sourceEntry = sources.find((entry) => entry.name === source) ?? { name: source, status: 'failed' as const };
  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${sourceStyles[source] ?? 'bg-slate-100 text-slate-800'}`}>
      <span className={`source-dot ${statusColor[sourceEntry.status]}`} />
      {sourceEntry.name}
    </div>
  );
}
