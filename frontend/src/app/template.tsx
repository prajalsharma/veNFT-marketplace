// Re-mounted by Next on every navigation, so each route's content settles in
// with a short transform + opacity entrance. CSS-only: it never delays the
// navigation itself and is disabled under prefers-reduced-motion.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
