import { GoogleSignInButton } from "@/features/sign-in/components/google-sign-in-button"

export function SignInCard() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-card bg-surface p-7 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Weight Tracker
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight font-extrabold tracking-tight">
          El pesaje familiar, en privado.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Una familia, un grupo cerrado y una pantalla compartida. Vos registrás el peso de cada
          persona y cada una ve su propia tendencia.
        </p>

        <div className="mt-7">
          <GoogleSignInButton />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink-muted">
          El grupo es cerrado: nadie entra sin una invitación tuya. Podés salir y borrar tus datos
          cuando quieras.
        </p>
      </div>
    </main>
  )
}
