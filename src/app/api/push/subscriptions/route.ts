import { NextResponse } from "next/server"

import { z } from "zod"

import { getSession } from "@/auth/session"
import {
  apiFailure,
  apiSuccess,
  API_INVALID_INPUT_MESSAGE,
  API_UNAUTHORIZED_MESSAGE,
} from "@/lib/api-response"
import { registerReminderPush, pushSubscriptionSchema, removeReminderPush } from "@/features/push/server/subscription-endpoints"

const subscribeRequestSchema = z.object({
  groupId: z.uuid(),
  subscription: pushSubscriptionSchema,
})

const unsubscribeRequestSchema = z.object({ endpoint: z.url() })

/**
 * Registers a web-push subscription for an active member's login. Subscriptions
 * carry the channel; the consent lives in the opt-in row this endpoint pair
 * never touches.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSession()

  if (!session) {
    return envelope(apiFailure([{ code: "unauthorized", message: API_UNAUTHORIZED_MESSAGE }], API_UNAUTHORIZED_MESSAGE), 401)
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

  const parsed = subscribeRequestSchema.safeParse(payload)

  if (!parsed.success) {
    return envelope(
      apiFailure([{ code: "invalid_input", message: API_INVALID_INPUT_MESSAGE }], API_INVALID_INPUT_MESSAGE),
      400,
    )
  }

  const result = await registerReminderPush({
    userId: session.user.id,
    groupId: parsed.data.groupId,
    subscription: parsed.data.subscription,
  })

  if (!result.ok) {
    return envelope(apiFailure([{ code: result.code, message: result.errorMessage }], result.errorMessage), 403)
  }

  return envelope(apiSuccess({ subscribed: true }, "Recordatorios activados en este dispositivo."), 200)
}

/**
 * Deletes only the calling login's subscription rows: another owner passing the
 * same endpoint removes nothing.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  const session = await getSession()

  if (!session) {
    return envelope(apiFailure([{ code: "unauthorized", message: API_UNAUTHORIZED_MESSAGE }], API_UNAUTHORIZED_MESSAGE), 401)
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

  const parsed = unsubscribeRequestSchema.safeParse(payload)

  if (!parsed.success) {
    return envelope(
      apiFailure([{ code: "invalid_input", message: API_INVALID_INPUT_MESSAGE }], API_INVALID_INPUT_MESSAGE),
      400,
    )
  }

  const removed = await removeReminderPush({
    userId: session.user.id,
    endpoint: parsed.data.endpoint,
  })

  return envelope(
    apiSuccess(
      { removed },
      removed
        ? "Recordatorios desactivados en este dispositivo."
        : "Este dispositivo ya no tenía recordatorios.",
    ),
    200,
  )
}

function envelope(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status })
}
