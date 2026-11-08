"use server"

import { revalidatePath } from "next/cache"

import { requireActingProfile } from "@/features/groups/server/acting-profile"
import { readCheckbox, readText } from "@/lib/form-data"
import { type FormState } from "@/lib/form-state"
import { setClaimPublication } from "./award-writes"

const NOT_PUBLISHABLE_MESSAGE = "Esa distinción no tiene publicación propia."

/**
 * Publishes or unpublishes the member's own "me moví más" badge. The claim
 * must belong to the active profile the caller acts as; anything else is
 * refused. Server actions are untrusted entry points, so the gate re-runs here
 * on every invocation, never because the form had that claim pre-filled.
 */
export async function setClaimPublicationAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, profileId } = await requireActingProfile()
  const claimId = readText(formData, "claimId")
  const shared = readCheckbox(formData, "shared")

  const result = await setClaimPublication(userId, profileId, { claimId, shared })

  if (!result.ok) {
    return {
      errorMessage:
        result.code === "claim_not_found"
          ? "No encontramos esa distinción."
          : NOT_PUBLISHABLE_MESSAGE,
    }
  }

  revalidatePath("/", "layout")

  return {}
}

/**
 * The plain form-action shape for RSC forms (React's `action` prop), sharing
 * the same validation gate and messages as the useActionState variant above.
 */
export async function setClaimPublicationFormAction(formData: FormData): Promise<void> {
  await setClaimPublicationAction({}, formData)
}
