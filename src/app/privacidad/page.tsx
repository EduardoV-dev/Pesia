import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de privacidad",
}

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-8">
      <article className="rounded-card bg-surface p-6 shadow-[0_18px_44px_rgba(150,95,45,0.14)] sm:p-8">
        <p className="font-display text-xs font-extrabold tracking-[0.2em] text-accent-strong uppercase">
          Legal
        </p>
        <h1 className="font-display mt-3 text-2xl leading-tight font-extrabold tracking-tight">
          Política de privacidad
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Escrita en lenguaje común, desde lo que la app hace de verdad. Es un borrador: antes del
          lanzamiento necesita la revisión de alguien con título.
        </p>

        <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed">
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Qué guardamos</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>Tu nombre, tu correo y tu foto, tal como vienen de tu cuenta de Google.</li>
              <li>
                Los perfiles que creás o manejás: nombre para mostrar, emoji, unidad de medida y,
                si lo activás vos, tu altura para la referencia de IMC.
              </li>
              <li>Tus objetivos: dirección, peso objetivo y banda, con la fecha de inicio.</li>
              <li>
                Cada pesada: el peso en kilogramos, el día en que se midió, el día en que se
                anotó, quién la registró y la nota privada de quien la escribió.
              </li>
              <li>Tus grupos: membresías, roles, permisos para registrar y nivel de visibilidad.</li>
              <li>Si aceptás recordatorios: tu suscripción de notificaciones para cada grupo.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Qué compartimos</h2>
            <p>
              Dentro de cada grupo, cada persona ve lo que su propio nivel de visibilidad permite:
              el nombre, el último peso, la tendencia o nada. Tu nota privada nunca la ve nadie
              más que vos, a ningún nivel. El tablero nunca ordena a la gente por su cuerpo: lo
              único que se compara es la constancia de cada uno.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Qué nunca guardamos</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>Calorías, comidas ni ningún otro dato de salud más allá del peso.</li>
              <li>Número de documento, dirección, teléfono ni datos de pago.</li>
              <li>Un motivo cuando alguien deja la app: no existe tal dato.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Cómo llevarte tus datos</h2>
            <p>
              Desde <strong>Cuenta</strong> podés descargar todo lo que guardamos sobre vos: un
              archivo completo (.json) y una planilla con tus pesadas (.csv). No hace falta pedirle
              a nadie.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Cómo borrarte</h2>
            <p>
              Desde <strong>Cuenta → Borrar mi cuenta</strong>. Se borra tu forma de entrar, tu
              perfil y las pesadas que registraron sobre vos. Las pesadas que registraste sobre
              otras personas siguen en la historia del grupo, firmadas por quien las registró.
              Para el grupo no hay motivo: simplemente dejás de aparecer.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Qué no es esta app</h2>
            <p>
              Es una herramienta de seguimiento para registrar y ver tendencias, no un dispositivo
              médico ni un consejo de salud. El IMC, si lo activás, es una medida de tamizaje
              poblacional: no dice nada fino sobre tu cuerpo ni reemplaza una consulta.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
