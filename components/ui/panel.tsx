import { cn } from "@/lib/utils";

type PanelProps = {
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
}: PanelProps) {
  return (
    <section
      className={cn(
        "panel-outline rounded-3xl p-5 shadow-lg shadow-slate-950/30",
        className,
      )}
    >
      {(title || eyebrow || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? (
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-indigo-300">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-2 text-lg font-semibold text-slate-50">{title}</h2>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
