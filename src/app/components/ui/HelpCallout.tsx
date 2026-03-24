import { type ReactNode } from 'react';
import { Info, Lightbulb, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

type HelpCalloutTone = 'info' | 'tip' | 'warning';

type HelpCalloutProps = {
  title: string;
  description: ReactNode;
  tone?: HelpCalloutTone;
  className?: string;
};

const toneStyles: Record<
  HelpCalloutTone,
  { container: string; icon: typeof Info }
> = {
  info: {
    container: 'border-sky-200 bg-sky-50 text-sky-950',
    icon: Info,
  },
  tip: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: Lightbulb,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: ShieldAlert,
  },
};

export function HelpCallout({
  title,
  description,
  tone = 'info',
  className,
}: HelpCalloutProps) {
  const config = toneStyles[tone];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 shadow-sm',
        config.container,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-white/70 p-2">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <div className="mt-1 text-sm leading-6 opacity-90">{description}</div>
        </div>
      </div>
    </div>
  );
}
