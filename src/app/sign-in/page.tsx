import { redirect } from "next/navigation"

import { getSession } from "@/auth/session"
import { SignInCard } from "@/features/sign-in/components/sign-in-card"

export const instant = false

export default async function SignInPage() {
  const session = await getSession()

  if (session) {
    redirect("/home")
  }

  return <SignInCard />
}
