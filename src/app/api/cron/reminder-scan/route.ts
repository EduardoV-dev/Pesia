import { NextResponse } from "next/server"

import { scanReminderGroups } from "@/features/reminders/server/scan"

const UNAUTHORIZED_MESSAGE = "No autorizado."

/**
 * The daily reminder scan trigger. Vercel Cron sends the `Authorization:
 * Bearer $CRON_SECRET` header; anything else is refused before any scan runs.
 * The runtime is nodejs: web-push is not edge-safe.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: UNAUTHORIZED_MESSAGE }, { status: 401 })
  }

  const counts = await scanReminderGroups(new Date())

  return NextResponse.json({ ok: true, counts }, { status: 200 })
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get("authorization") ?? ""

  return secret !== undefined && secret !== "" && header === `Bearer ${secret}`
}
