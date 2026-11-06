import type { ReactNode } from "react"

import { SignOutButton } from "@/components/app-shell/sign-out-button"
import { ThemeToggle } from "@/components/app-shell/theme-toggle"

export type AppHeaderProps = {
  readonly children?: ReactNode
}

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-extrabold tracking-[0.16em] text-ink uppercase">
          Weight Tracker
        </span>
        {children}
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  )
}
