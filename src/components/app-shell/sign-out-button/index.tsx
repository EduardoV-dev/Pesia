import { signOut } from "@/auth/sign-out"

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-control px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        Salir
      </button>
    </form>
  )
}
