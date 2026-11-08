import { NextResponse } from "next/server"

import { z } from "zod"

import { auth } from "@/auth/auth"
import { currentMonthPeriod } from "@/features/awards/period"
import { computeGroupAwardClaims } from "@/features/awards/server/award-compute"
import { getGroup, getMembership } from "@/features/groups/server/group-access"
import {
  ACTIVE_PROFILE_COOKIE_NAME,
  pickActiveProfile,
} from "@/features/profiles/server/active-profile"
import {
  getManagedProfiles,
  getSelfProfile,
} from "@/features/profiles/server/profile-access"
import {
  apiFailure,
  apiSuccess,
  API_INVALID_INPUT_MESSAGE,
  API_UNAUTHORIZED_MESSAGE,
} from "@/lib/api-response"

const computeRequestSchema = z.object({ groupId: z.uuid() })

const NO_ACTIVE_PROFILE_MESSAGE = "Elegí un perfil activo para reclamar las distinciones."
const NOT_A_MEMBER_MESSAGE = "No sos parte de este grupo."

/** The per-request cookie read: the route never reaches into `next/headers`. */
function readCookieValue(request: Request, cookieName: string): string | null {
  const cookieHeader = request.headers.get("cookie")

  if (!cookieHeader) {
    return null
  }

  const pair = cookieHeader
    .split("; ")
    .find((candidate) => candidate.startsWith(`${cookieName}=`))

  return pair ? decodeURIComponent(pair.slice(cookieName.length + 1)) : null
}

/**
 * The compute trigger a client can call after a weigh-in lands: it recomputes
 * the calling member's group for the current period. Reading stays in the
 * board; this route only writes award_claims for that group's own members.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return envelope(apiFailure([{ code: "unauthorized", message: API_UNAUTHORIZED_MESSAGE }], API_UNAUTHORIZED_MESSAGE), 401)
  }

  const [managedProfiles, selfProfile] = await Promise.all([
    getManagedProfiles(session.user.id),
    getSelfProfile(session.user.id),
  ])
  const actingProfile = pickActiveProfile({
    managedProfiles,
    activeProfileId: readCookieValue(request, ACTIVE_PROFILE_COOKIE_NAME),
    selfProfile,
  })

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

  const parsed = computeRequestSchema.safeParse(payload)

  if (!parsed.success) {
    return envelope(
      apiFailure([{ code: "invalid_input", message: API_INVALID_INPUT_MESSAGE }], API_INVALID_INPUT_MESSAGE),
      400,
    )
  }

  const [membership, group] = await Promise.all([
    getMembership(parsed.data.groupId, actingProfile.id),
    getGroup(parsed.data.groupId),
  ])

  if (!membership || !group) {
    return envelope(
      apiFailure([{ code: "not_a_member", message: NOT_A_MEMBER_MESSAGE }], NOT_A_MEMBER_MESSAGE),
      403,
    )
  }

  const period = currentMonthPeriod(group.timezone)

  await computeGroupAwardClaims({
    groupId: group.id,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    computedByUserId: session.user.id,
  })

  return envelope(apiSuccess({ computedPeriod: period }, "Distinciones recalculadas."), 200)
}

function envelope(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status })
}
