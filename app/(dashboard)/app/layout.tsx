export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#eff0f2" }}>
      {children}
    </div>
  )
}
