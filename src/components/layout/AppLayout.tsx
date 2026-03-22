import TopNav from "@/components/layout/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAF7F2" }}>
      <TopNav />
      <main>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 32px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
