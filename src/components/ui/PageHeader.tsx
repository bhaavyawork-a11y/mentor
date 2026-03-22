interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "24px" }}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1a1a1a", margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: "13px", color: "#888888", marginTop: "4px" }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
