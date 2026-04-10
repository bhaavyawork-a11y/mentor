import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import MobileHeader from "@/components/layout/MobileHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#0F1117" }}>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <Sidebar />

      <main
        style={{ flex: 1, overflowX: "hidden" }}
        className="app-main"
      >
        {/* Mobile top header — logo + profile icon, shown only on mobile */}
        <div className="mobile-top-header">
          <MobileHeader />
        </div>

        {children}
      </main>

      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <div className="mobile-bottom-nav">
        <BottomNav />
      </div>
    </div>
  );
}
