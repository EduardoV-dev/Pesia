import { z } from "zod"

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL está vacía"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET está vacía"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL no es una URL válida"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID está vacío"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET está vacío"),
})

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>

function readServerEnvironment(): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  })

  if (!result.success) {
    const missingVariables = result.error.issues.map((issue) => issue.path.join(".")).join(", ")

    throw new Error(
      `Falta configuración del entorno: ${missingVariables}. Copiá env.example a .env.local y completá esos valores.`,
    )
  }

  return result.data
}

export const SERVER_ENVIRONMENT: ServerEnvironment = readServerEnvironment()
