"use client"

import { startTransition, useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateGroupSettingsAction } from "@/features/groups/server/group-actions"
import { WEEKDAY_LABELS } from "@/features/groups/weigh-in"

export type GroupSettingsFormProps = {
  readonly groupId: string
  readonly weighInWeekday: number
  readonly weighInTime: string | null
}

export function GroupSettingsForm({ groupId, weighInWeekday, weighInTime }: GroupSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateGroupSettingsAction, {})

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        startTransition(() => formAction(formData))
      }}
    >
      <input type="hidden" name="groupId" value={groupId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="weighInWeekday" className="text-sm font-semibold">
          ¿Qué día pesamos?
        </Label>
        <select
          id="weighInWeekday"
          name="weighInWeekday"
          defaultValue={String(weighInWeekday)}
          className="h-auto w-full rounded-control border-line bg-surface-muted px-4 py-3 text-base focus-visible:border-accent"
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="weighInTime" className="text-sm font-semibold">
          ¿A qué hora? (opcional)
        </Label>
        <Input
          id="weighInTime"
          name="weighInTime"
          type="time"
          defaultValue={weighInTime ?? ""}
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base focus-visible:border-accent"
        />
      </div>

      {state.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {state.errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="h-auto self-start rounded-control bg-accent px-5 py-3.5 font-display font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:bg-accent hover:opacity-90"
      >
        {isPending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  )
}
