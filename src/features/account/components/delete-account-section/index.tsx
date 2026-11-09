"use client"

import { useActionState } from "react"

import { deleteAccountAction } from "@/features/account/account-actions"
import type { FormState } from "@/lib/form-state"
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

export function DeleteAccountSection() {
  const [state, formAction, isPending] = useActionState(
    async (): Promise<FormState> => {
      await deleteAccountAction()
      return {}
    },
    {},
  )

  return (
    <section className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
      <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
        Cuenta
      </p>
      <h2 className="font-display mt-3 text-lg leading-tight font-extrabold tracking-tight">
        Borrar mi cuenta
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Una decisión grande. Antes te contamos exactamente qué borra y qué queda.
      </p>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="mt-5 h-auto rounded-control border border-destructive/40 bg-transparent px-5 py-3.5 font-display text-sm font-extrabold text-destructive hover:bg-destructive/10"
          >
            Quiero borrar mi cuenta
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar la cuenta para siempre?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-3">
                <span>Esto es lo que se borra:</span>
                <ul className="flex list-disc flex-col gap-1 pl-5">
                  <li>Tu forma de entrar y todas tus sesiones abiertas.</li>
                  <li>Tu perfil.</li>
                  <li>Las pesadas que registraron sobre vos.</li>
                </ul>
                <span>Y esto es lo que queda:</span>
                <ul className="flex list-disc flex-col gap-1 pl-5">
                  <li>
                    Las pesadas que registraste sobre otras personas siguen en la historia del
                    grupo, firmando como la persona que las registró.
                  </li>
                </ul>
                <span>
                  Nadie recibe un motivo: para el grupo simplemente dejás de aparecer. Después
                  no hay vuelta atrás.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Mejor no</AlertDialogCancel>
            <form action={formAction}>
              <AlertDialogAction
                type="submit"
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive hover:opacity-90"
              >
                {isPending ? "Borrando…" : "Borrar mi cuenta"}
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
