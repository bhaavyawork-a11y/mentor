// Negate the AppLayout padding so the chat fills the full viewport height.
// The Sidebar is already provided by communities/layout.tsx → AppLayout.
// On mobile: uses .community-slug-layout CSS class which handles the bottom nav offset.
export default function CommunitySlugLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="community-slug-layout">
      {children}
    </div>
  );
}
