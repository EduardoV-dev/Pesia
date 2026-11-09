"use client"

import { useActionState } from "react"

import { removeProfileAction } from "@/features/profiles/server/remove-profile-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export type RemoveProfileSectionProps = {
  readonly profileId: string
  readonly displayName: string
}

export function RemoveProfileSection({ profileId, displayName }: RemoveProfileSectionProps) {
  const [state, formAction, isPending] = useActionState(removeProfileAction, {})

  return (
    <section className="mt-5 rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
      <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
        Dejar de registrar
      </p>
      <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
        Quitar a {displayName} de las pesadas
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Deja de aparecer en la hoja de pesadas y no se vuelve a registrar. Lo que el grupo ya vio
        de su historia, sigue viéndose.
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="mt-5 h-auto rounded-control border border-destructive/40 bg-transparent px-5 py-3.5 font-display text-sm font-extrabold text-destructive hover:bg-destructive/10"
          >
            Quitar perfil
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar a {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Nadie va a poder registrar más pesadas para este perfil y desaparece de la hoja de
              pesadas. La historia que el grupo ya vio sigue estando ahí. Podés cancelar y no
              cambia nada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Mejor no</AlertDialogCancel>
            <form action={formAction}>
              <input type="hidden" name="profileId" value={profileId} />
              <AlertDialogAction
                type="submit"
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive hover:opacity-90"
              >
                {isPending ? "Quitando…" : `Quitar a ${displayName}`}
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {state.errorMessage ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.errorMessage}
        </p>
      ) : null}
    </section>
  )
}
