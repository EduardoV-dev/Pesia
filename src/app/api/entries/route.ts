import { NextResponse } from "next/server"

import { getSession } from "@/auth/session"
import { resolveActiveProfile } from "@/features/profiles/server/active-profile"
import { entrySyncRequestSchema } from "@/features/entries/sync-batch"
import { applyEntryOps } from "@/features/entries/server/apply-entry-ops"
import {
  apiFailure,
  apiSuccess,
  API_INVALID_INPUT_MESSAGE,
  API_UNAUTHORIZED_MESSAGE,
} from "@/lib/api-response"

const NO_ACTIVE_PROFILE_MESSAGE = "Elegí un perfil activo para registrar las pesadas."

/**
 * The one client-callable write path. It only accepts queued upserts and
 * answers per-item verdicts: reads stay in server components behind the
 * assembler, so no raw membership-plus-entries payload can ever be served.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSession()

  if (!session) {
    return envelope(apiFailure([{ code: "unauthorized", message: API_UNAUTHORIZED_MESSAGE }], API_UNAUTHORIZED_MESSAGE), 401)
  }

  const actingProfile = await resolveActiveProfile(session.user.id)

  if (!actingProfile) {
    return envelope(
      apiFailure([{ code: "no_active_profile", message: NO_ACTIVE_PROFILE_MESSAGE }], NO_ACTIVE_PROFILE_MESSAGE),
      400,
    )
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return envelope(
      apiFailure([{ code: "invalid_input", message: API_INVALID_INPUT_MESSAGE }], API_INVALID_INPUT_MESSAGE),
      400,
    )
  }

  const parsed = entrySyncRequestSchema.safeParse(payload)

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]

    return envelope(
      apiFailure(
        [{ code: "invalid_input", message: firstIssue?.message ?? API_INVALID_INPUT_MESSAGE }],
        firstIssue?.message ?? API_INVALID_INPUT_MESSAGE,
      ),
      400,
    )
  }

  const results = await applyEntryOps({
    userId: session.user.id,
    actingProfileId: actingProfile.id,
    ops: parsed.data.ops,
  })

  return envelope(apiSuccess({ results }, "Pesadas sincronizadas."), 200)
}

function envelope(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status })
}
