// Pass children through directly — each communities page handles its own layout/nav
export default function CommunitiesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
