"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { CADENCE_LABELS, type CadenceKey } from "@/features/groups/cadence"
import {
  GROUP_VISIBILITY_DESCRIPTIONS,
  GROUP_VISIBILITY_LABELS,
  GROUP_VISIBILITIES,
  type GroupVisibility,
} from "@/features/groups/visibility"
import { updateMemberSettingsAction } from "@/features/permissions/server/permission-actions"

export type MemberSettingsFormProps = {
  readonly groupId: string
  readonly visibility: GroupVisibility
  readonly rankingOptOut: boolean
  readonly cadenceKey: CadenceKey
  readonly isDependent: boolean
}

const CADENCE_KEYS: readonly CadenceKey[] = ["weekly", "biweekly", "monthly", "none"]

export function MemberSettingsForm({
  groupId,
  visibility,
  rankingOptOut,
  cadenceKey,
  isDependent,
}: MemberSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateMemberSettingsAction, {})

  return (
    <div className="flex flex-col gap-6">
      {state.errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {state.errorMessage}
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="field" value="visibility" />

        <p className="text-sm font-semibold">Qué ve el grupo de vos</p>

        <div className="flex flex-wrap gap-2">
          {GROUP_VISIBILITIES.map((level) => (
            <label
              key={level}
              className="cursor-pointer rounded-full bg-surface-muted px-4 py-2 text-sm font-semibold has-checked:bg-accent has-checked:text-accent-ink"
            >
              <input
                type="radio"
                name="value"
                value={level}
                defaultChecked={level === visibility}
                className="sr-only"
              />
              {GROUP_VISIBILITY_LABELS[level]}
            </label>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-ink-muted">
          {GROUP_VISIBILITY_DESCRIPTIONS[visibility]} Vos siempre ves tus propios datos.
        </p>

        <Button
          type="submit"
          disabled={isPending}
          variant="outline"
          className="h-auto self-start rounded-control bg-surface-muted px-4 py-2.5 font-display font-extrabold text-ink hover:opacity-80"
        >
          Guardar la visibilidad
        </Button>
      </form>

      {!isDependent ? (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="field" value="rankingOptOut" />

          <p className="text-sm font-semibold">Ranking</p>

          <label className="flex cursor-pointer items-center gap-3 rounded-control bg-surface-muted px-4 py-3">
            <input
              type="checkbox"
              name="value"
              defaultChecked={rankingOptOut}
              className="size-5 accent-accent"
            />
            <span className="text-sm leading-relaxed">
              Sacame del ranking del grupo. Sigo en el grupo y en la hoja de pesaje.
            </span>
          </label>

          <Button
            type="submit"
            disabled={isPending}
            variant="outline"
            className="h-auto self-start rounded-control bg-surface-muted px-4 py-2.5 font-display font-extrabold text-ink hover:opacity-80"
          >
            Guardar el ranking
          </Button>
        </form>
      ) : null}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="field" value="cadence" />

        <p className="text-sm font-semibold">Cada cuánto te pesamos</p>

        <div className="flex flex-wrap gap-2">
          {CADENCE_KEYS.map((key) => (
            <label
              key={key}
              className="cursor-pointer rounded-full bg-surface-muted px-4 py-2 text-sm font-semibold has-checked:bg-accent has-checked:text-accent-ink"
            >
              <input
                type="radio"
                name="value"
                value={key}
                defaultChecked={key === cadenceKey}
                className="sr-only"
              />
              {CADENCE_LABELS[key]}
            </label>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-ink-muted">
          Esto solo cambia cuándo te avisamos. No cambia si podés anotar tu peso.
        </p>

        <Button
          type="submit"
          disabled={isPending}
          variant="outline"
          className="h-auto self-start rounded-control bg-surface-muted px-4 py-2.5 font-display font-extrabold text-ink hover:opacity-80"
        >
          Guardar el ritmo
        </Button>
      </form>
    </div>
  )
}
