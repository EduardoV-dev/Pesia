"use client"

import type { ChangeEvent } from "react"

import { useReminderDevice, type ReminderDeviceState } from "./use-reminder-device"

export type ReminderOptInSectionProps = {
  readonly groupId: string
  /** The server truth of the consent; the browser flow can only change it. */
  readonly initialEnabled: boolean
  /** The VAPID public key; `null` means pushes are not configured yet. */
  readonly vapidPublicKey: string | null
}

const TOGGLE_LABEL = "Avisame cuando sea el turno de alguien"
const HINT_COPY = "El aviso nombra a la persona y nada más: nunca muestra pesos ni resultados."
const NO_PUSH_CONFIGURED_COPY =
  "Los avisos del dispositivo todavía no están configurados, pero los recordatorios pueden llegarte por email."

export function ReminderOptInSection({
  groupId,
  initialEnabled,
  vapidPublicKey,
}: ReminderOptInSectionProps) {
  const { state, enable, disable } = useReminderDevice(vapidPublicKey)
  const busy = state.kind === "pending"

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const checkbox = event.target
    const checked = checkbox.checked

    const flow = checked ? enable(groupId) : disable(groupId)

    void flow
      .then((outcome) => {
        // A refused enable leaves the consent and the visual untouched.
        if (checked && outcome === false) {
          checkbox.checked = false
        }
      })
      .catch(() => {
        checkbox.checked = false
      })
  }

  const statusMessage = statusOf(state, vapidPublicKey === null)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">Recordatorios</p>

      <label className="flex cursor-pointer items-start gap-3 rounded-control bg-surface-muted px-4 py-3">
        <input
          type="checkbox"
          defaultChecked={initialEnabled}
          disabled={busy}
          className="mt-0.5 size-5 accent-accent"
          onChange={handleChange}
        />
        <span className="text-sm leading-relaxed">{TOGGLE_LABEL}</span>
      </label>

      {statusMessage ? (
        <p
          role={state.kind === "denied" ? "alert" : undefined}
          className={
            state.kind === "denied" ? "text-xs leading-relaxed text-destructive" : "text-xs leading-relaxed text-ink-muted"
          }
        >
          {statusMessage}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-ink-muted">{HINT_COPY}</p>
    </div>
  )
}

function statusOf(state: ReminderDeviceState, pushNotConfigured: boolean): string | null {
  if (state.kind === "denied") {
    return state.message
  }

  if (state.kind === "notice") {
    return state.message
  }

  return pushNotConfigured ? NO_PUSH_CONFIGURED_COPY : null
}
