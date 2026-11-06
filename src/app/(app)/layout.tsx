import { AppHeader } from "@/components/app-shell/app-header"
import { requireSession } from "@/auth/session"

export const instant = false

export default async function AppAreaLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireSession()

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      {children}
    </div>
  )
}
