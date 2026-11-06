import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/auth/auth"

export type Session = typeof auth.$Infer.Session

export const getSession = cache(async (): Promise<Session | null> => {
  const requestHeaders = await headers()

  return auth.api.getSession({ headers: requestHeaders })
})

export async function requireSession(): Promise<Session> {
  const session = await getSession()

  if (!session) {
    redirect("/sign-in")
  }

  return session
}
