import type { Metadata } from "next"

import { OfflineShell } from "@/features/entries/components/offline-shell"

export const metadata: Metadata = {
  title: "Sin conexión · Weight Tracker",
}

export default function OfflinePage() {
  return <OfflineShell />
}
