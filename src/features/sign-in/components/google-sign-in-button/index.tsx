"use client"

import { useState } from "react"

import { authClient } from "@/auth/auth-client"
import { Button } from "@/components/ui/button"

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

export function GoogleSignInButton() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSignIn() {
    setIsPending(true)
    setErrorMessage(null)

    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" })
    } catch {
      setErrorMessage("No pudimos iniciar sesión con Google. Probá de nuevo.")
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleSignIn}
        disabled={isPending}
        aria-label="Continuar con Google"
        className="h-auto w-full rounded-control border-line bg-surface px-5 py-3.5 font-semibold text-ink shadow-[0_10px_26px_rgba(150,95,45,0.10)] hover:bg-surface hover:opacity-90"
      >
        <GoogleMark />
        {isPending ? "Abriendo Google…" : "Continuar con Google"}
      </Button>

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
