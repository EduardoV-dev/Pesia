import { requireSession } from "@/auth/session"
import { ExportButtons } from "@/features/account/components/export-buttons"
import { DeleteAccountSection } from "@/features/account/components/delete-account-section"
import { getManagedProfiles } from "@/features/profiles/server/profile-access"

export const instant = false

export default async function AccountPage() {
  const session = await requireSession()
  const managedProfiles = await getManagedProfiles(session.user.id)
  const ownProfile = managedProfiles.find((profile) => profile.userId === session.user.id)

  return (
    <main className="flex-1 px-5 pb-8">
      <div className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)]">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Cuenta
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          Tus datos son tuyos
        </h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-ink-muted">
          {ownProfile
            ? `Todo lo que la app guarda sobre vos y sobre los perfiles que manejás${managedProfiles.length > 1 ? ", incluido el de cada persona a tu cargo" : ""}: los perfiles, los objetivos, todas las pesadas (las haya registrado quien las haya registrado), tus grupos y tus permisos.`
            : "Todo lo que la app guarda sobre los perfiles que manejás: los perfiles, los objetivos, todas las pesadas, tus grupos y tus permisos."}
        </p>

        <ExportButtons />
        <p className="mt-3 text-xs text-ink-muted">
          El archivo .json tiene todo; el .csv tiene una fila por pesada, listo para una planilla.
          Las notas de otras personas no vienen incluidas: son privadas de quien las escribió.
        </p>
      </div>

      <div className="mt-5">
        <DeleteAccountSection />
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        <a href="/privacidad" className="underline hover:text-ink">
          Política de privacidad
        </a>{" "}
        ·{" "}
        <a href="/terminos" className="underline hover:text-ink">
          Términos de uso
        </a>
      </p>
    </main>
  )
}
