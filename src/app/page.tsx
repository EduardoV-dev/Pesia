import { redirect } from "next/navigation"

import { resolveEntryRoute } from "@/features/entries/server/resolve-entry-route"

export const instant = false

export default async function IndexPage() {
  redirect(await resolveEntryRoute())
}
