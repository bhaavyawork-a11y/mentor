import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F9F7EC" }}>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <Sidebar />

      <main
        style={{ flex: 1, overflowX: "hidden" }}
        className="app-main"
      >
        {children}
      </main>

      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <div className="mobile-bottom-nav">
        <BottomNav />
      </div>
    </div>
  );
}
