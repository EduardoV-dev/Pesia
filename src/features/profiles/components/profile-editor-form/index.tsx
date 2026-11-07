"use client"

import { startTransition, useActionState } from "react"

import { type Profile } from "@/db/schema"
import { UnitPicker } from "@/components/unit-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateProfileAction } from "@/features/profiles/server/update-profile"

export type ProfileEditorFormProps = {
  readonly profile: Profile
}

export function ProfileEditorForm({ profile }: ProfileEditorFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, {})

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        // React resets a form after a server action, which would wipe what was typed.
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        startTransition(() => formAction(formData))
      }}
    >
      <input type="hidden" name="profileId" value={profile.id} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName" className="text-sm font-semibold">
          ¿Cómo te llamamos?
        </Label>
        <Input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          required
          maxLength={60}
          defaultValue={profile.displayName}
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="avatarEmoji" className="text-sm font-semibold">
          Emoji
        </Label>
        <Input
          id="avatarEmoji"
          name="avatarEmoji"
          type="text"
          maxLength={8}
          defaultValue={profile.avatarEmoji ?? ""}
          placeholder="👩"
          className="rounded-control border-line bg-surface-muted px-4 py-3 text-base placeholder:text-ink-muted focus-visible:border-accent"
        />
        <p className="text-xs text-ink-muted">Un emoji para reconocer el perfil de un vistazo.</p>
      </div>

      <UnitPicker legend="¿En qué unidad pesás?" defaultUnit={profile.unit} />

      {state.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {state.errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="h-auto rounded-control bg-accent px-5 py-3.5 font-display font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:bg-accent hover:opacity-90"
      >
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  )
}
