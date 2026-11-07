import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { SERVER_ENVIRONMENT } from "@/constants/environment-variables"

import * as schema from "./schema"

const globalForDatabase = globalThis as unknown as {
  postgresClient?: ReturnType<typeof postgres>
}

const postgresClient =
  globalForDatabase.postgresClient ??
  postgres(SERVER_ENVIRONMENT.DATABASE_URL, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    onnotice: () => {},
  })

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.postgresClient = postgresClient
}

export const db = drizzle(postgresClient, { schema })

/** The transaction handle `db.transaction` hands to its callback. */
export type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
