"use client"

import { useInstallPrompt } from "./use-install-prompt"

const BUTTON_LABEL = "Instalar la app"
const IOS_GUIDE_TITLE = "Podés tener la app en tu pantalla"
const IOS_GUIDE_COPY =
  "En iPhone o iPad: abrí el menú Compartir y elegí «Añadir a la pantalla de inicio». Así el ícono queda como en cualquier app."

export function InstallApp() {
  const { availability, promptInstall } = useInstallPrompt()

  if (availability === "standalone" || availability === "unavailable") {
    return null
  }

  if (availability === "guide") {
    return (
      <div className="rounded-control bg-accent-soft px-4 py-3">
        <p className="text-sm font-semibold text-accent-strong">{IOS_GUIDE_TITLE}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{IOS_GUIDE_COPY}</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        void promptInstall()
      }}
      className="inline-block rounded-control bg-accent px-5 py-3 font-display font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:opacity-90"
    >
      {BUTTON_LABEL}
    </button>
  )
}
