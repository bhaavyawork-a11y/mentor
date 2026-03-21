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
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f0f0f" }}>{title}</h1>
        {subtitle && (
          <p className="mt-1 text-[13px]" style={{ color: "#0f0f0f66" }}>{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
