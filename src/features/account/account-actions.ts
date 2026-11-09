"use server"

import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { deleteAccount } from "./server/delete-account"

/**
 * The deletion entry point. The session comes from the request scope and the user
 * id never comes from the client; after the delete, the session rows are gone with
 * the cascade, so the cookie can no longer authenticate anything.
 */
export async function deleteAccountAction(): Promise<void> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  await deleteAccount(session.user.id)

  redirect("/sign-in?cuenta-eliminada=1")
}
