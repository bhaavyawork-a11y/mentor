interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      className="flex items-start justify-between gap-4 opacity-0 animate-fade-up"
      style={{ animationFillMode: "forwards" }}
    >
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
        {subtitle && (
          <p className="text-ink/50 mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
