import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#F9F7EC" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowX: "hidden", padding: "28px 32px" }}>
        {children}
      </main>
    </div>
  );
}
