import { redirect } from "next/navigation"

import { resolveEntryRoute } from "@/features/entry/server/resolve-entry-route"

export const instant = false

export default async function IndexPage() {
  redirect(await resolveEntryRoute())
}
