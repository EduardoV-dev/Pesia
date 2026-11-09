import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos de uso",
}

export default function TerminosPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-8">
      <article className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)] sm:p-8">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Legal
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          Términos de uso
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          En lenguaje común, desde lo que la app hace de verdad. Es un borrador: antes del
          lanzamiento necesita la revisión de alguien con título.
        </p>

        <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed">
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Qué es</h2>
            <p>
              Una aplicación donde un grupo cerrado —por invitación— lleva un registro de pesadas:
              una persona registra y cada uno ve su propia tendencia respecto de su propio
              objetivo. Es una herramienta de seguimiento, no un dispositivo médico ni un consejo
              de salud. El IMC, si lo activás, es una medida de tamizaje: no reemplaza una
              consulta profesional.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Cómo entrás</h2>
            <p>
              Sólo con invitación de un grupo y con tu cuenta de Google. El grupo es cerrado: nadie
              más ve nada.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Lo que te pedimos</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>Registrar el peso de otra persona sólo con su permiso o siendo su responsable.</li>
              <li>Respetar la privacidad de los que eligen verse menos.</li>
              <li>No usar la app para comparar cuerpos ni presionar a nadie: acá se compara constancia.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Tus datos</h2>
            <p>
              Son tuyos: podés descargarlos cuando quieras desde <strong>Cuenta</strong>, y podés
              borrar tu cuenta cuando quieras. Las reglas exactas de qué se borra y qué queda están
              en la <strong>política de privacidad</strong>, y la app te lo repite antes de que
              confirmes el borrado.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Los recordatorios</h2>
            <p>
              Son opcionales, se activan y se apagan desde el grupo, nombran de quién es el turno y
              nunca mencionan un peso.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
