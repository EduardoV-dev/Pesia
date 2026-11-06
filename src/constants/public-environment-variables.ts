import { z } from "zod"

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url("NEXT_PUBLIC_APP_URL no es una URL válida"),
})

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>

const result = publicEnvironmentSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
})

if (!result.success) {
  const missingVariables = result.error.issues.map((issue) => issue.path.join(".")).join(", ")

  throw new Error(
    `Falta configuración del entorno: ${missingVariables}. Copiá env.example a .env.local y completá esos valores.`,
  )
}

export const PUBLIC_ENVIRONMENT: PublicEnvironment = result.data
