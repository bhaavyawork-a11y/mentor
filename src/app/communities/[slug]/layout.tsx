// Negate the AppLayout padding so the chat fills the full viewport height.
// The Sidebar is already provided by communities/layout.tsx → AppLayout.
export default function CommunitySlugLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      margin: "-28px -32px",         // undo AppLayout's 28px/32px padding
      height: "calc(100vh)",          // fill the visible area
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    }}>
      {children}
    </div>
  );
}
