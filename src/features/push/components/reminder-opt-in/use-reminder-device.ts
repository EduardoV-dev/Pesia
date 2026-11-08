"use client"

import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from "react"

import { type FormState } from "@/lib/form-state"

import { setReminderOptInAction } from "../../actions"

export type ReminderDeviceState =
  | { readonly kind: "idle" }
  | { readonly kind: "pending" }
  | { readonly kind: "denied"; readonly message: string }
  | { readonly kind: "notice"; readonly message: string }

type SetReminderState = Dispatch<SetStateAction<ReminderDeviceState>>

type UseReminderDeviceReturn = {
  readonly state: ReminderDeviceState
  enable: (groupId: string) => Promise<boolean>
  disable: (groupId: string) => Promise<void>
}

const PERMISSION_DENIED_MESSAGE =
  "Los avisos están bloqueados en el navegador. Habilitá el permiso de notificaciones para este sitio y volvé a intentar."
const NOTIFICATIONS_UNAVAILABLE_MESSAGE =
  "Las notificaciones del dispositivo no están disponibles en este navegador (en iPhone, instalá la app en la pantalla de inicio). Tu consentimiento queda anotado y te llega por email."
const SUBSCRIPTION_FAILED_MESSAGE =
  "No pudimos registrar los avisos en este dispositivo. Probá de nuevo en un rato."

/** The browser's push subscription JSON shape the subscribe endpoint accepts. */
type PushSubscriptionPayload = {
  readonly endpoint: string
  readonly keys: { readonly p256dh: string; readonly auth: string }
}

const SUBSCRIBE_PATH = "/api/push/subscriptions"

/**
 * The device-side reminder opt-in: the permission prompt runs inside the
 * toggle's own click gesture, the push subscription registers before the
 * consent persists, and a denied permission never stores anything (G7). A
 * browser without a notification API keeps the consent: the email fallback
 * carries those reminders. One flow at a time — a doubled gesture must not
 * register two endpoints and orphan the first behind a dead FCM registration.
 */
export function useReminderDevice(vapidPublicKey: string | null): UseReminderDeviceReturn {
  const [state, setState] = useState<ReminderDeviceState>({ kind: "idle" })
  const inFlightRef = useRef(false)

  const enable = useCallback(
    async (groupId: string): Promise<boolean> => {
      if (typeof window === "undefined" || inFlightRef.current) {
        return true
      }

      inFlightRef.current = true

      try {
        return await enableReminderDevice(groupId, vapidPublicKey, setState)
      } finally {
        inFlightRef.current = false
      }
    },
    [vapidPublicKey],
  )

  const disable = useCallback(async (groupId: string): Promise<void> => {
    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true

    try {
      await disableReminderDevice(groupId, setState)
    } finally {
      inFlightRef.current = false
    }
  }, [])

  return { state, enable, disable }
}

async function enableReminderDevice(
  groupId: string,
  vapidPublicKey: string | null,
  setState: SetReminderState,
): Promise<boolean> {
  setState({ kind: "pending" })

  if (!("Notification" in window)) {
    setState({ kind: "notice", message: NOTIFICATIONS_UNAVAILABLE_MESSAGE })

    return persistConsent(groupId, true)
  }

  const permission = Notification.permission

  if (permission === "denied") {
    setState({ kind: "denied", message: PERMISSION_DENIED_MESSAGE })

    return false
  }

  if (permission === "default") {
    const granted = (await Notification.requestPermission()) === "granted"

    if (!granted) {
      setState({ kind: "denied", message: PERMISSION_DENIED_MESSAGE })

      return false
    }
  }

  let subscriptionEndpoint: string | null = null

  if (hasPushService() && vapidPublicKey) {
    const subscribed = await subscribeDevice(vapidPublicKey)

    if (subscribed === null) {
      setState({ kind: "denied", message: SUBSCRIPTION_FAILED_MESSAGE })

      return false
    }

    const stored = await storeSubscription(groupId, subscribed)

    if (!stored) {
      setState({ kind: "denied", message: SUBSCRIPTION_FAILED_MESSAGE })

      return false
    }

    subscriptionEndpoint = subscribed.endpoint
  }

  const persisted = await persistConsent(groupId, true)

  if (!persisted && subscriptionEndpoint) {
    await dropStoredSubscription(subscriptionEndpoint)

    setState({ kind: "denied", message: SUBSCRIPTION_FAILED_MESSAGE })

    return false
  }

  setState({ kind: "idle" })

  return persisted
}

async function disableReminderDevice(groupId: string, setState: SetReminderState): Promise<void> {
  await persistConsent(groupId, false)

  if (hasPushService()) {
    const registration = await navigator.serviceWorker.getRegistration()

    if (registration) {
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await dropStoredSubscription(subscription.endpoint)
      }
    }
  }

  setState({ kind: "idle" })
}

async function persistConsent(groupId: string, enabled: boolean): Promise<boolean> {
  const form = new FormData()

  form.set("groupId", groupId)
  form.set("enabled", enabled ? "true" : "false")

  const result: FormState = await setReminderOptInAction({}, form)

  return result.errorMessage === undefined
}

function hasPushService(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

async function subscribeDevice(vapidPublicKey: string): Promise<PushSubscriptionPayload | null> {
  const registration = await navigator.serviceWorker.ready

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

  if (applicationServerKey === null) {
    return null
  }

  try {
    // An existing subscription for this origin is reused: a second opt-in must
    // not orphan the previous endpoint row behind a fresh FCM registration.
    const existing = await registration.pushManager.getSubscription()
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }))

    const keys = {
      p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
      auth: arrayBufferToBase64(subscription.getKey("auth")),
    }

    if (keys.p256dh === "" || keys.auth === "") {
      return null
    }

    return { endpoint: subscription.endpoint, keys }
  } catch {
    return null
  }
}

async function storeSubscription(
  groupId: string,
  subscription: PushSubscriptionPayload,
): Promise<boolean> {
  try {
    const response = await fetch(SUBSCRIBE_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ groupId, subscription }),
    })

    return response.ok
  } catch {
    return false
  }
}

async function dropStoredSubscription(endpoint: string): Promise<void> {
  try {
    await fetch(SUBSCRIBE_PATH, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    })
  } catch {
    // An unreachable server keeps the row; the next scan reaps the dead endpoint.
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) {
    return ""
  }

  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> | null {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  let decoded: string

  try {
    decoded = atob(base64)
  } catch {
    return null
  }

  const bytes = new Uint8Array(decoded.length)

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index)
  }

  return bytes.length === 0 ? null : bytes
}
