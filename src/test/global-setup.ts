import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5435/weight_tracker_test"

function resolveTestDatabaseUrl(): string {
  const baseDatabaseUrl = process.env.DATABASE_URL

  if (!baseDatabaseUrl) {
    return DEFAULT_TEST_DATABASE_URL
  }

  return baseDatabaseUrl.replace(/\/[^/?]+(?=\?|$)/, "/weight_tracker_test")
}

export default async function globalSetup() {
  const client = postgres(resolveTestDatabaseUrl(), { max: 1, onnotice: () => {} })

  try {
    const database = drizzle(client)
    await migrate(database, { migrationsFolder: "./drizzle" })
  } finally {
    await client.end()
  }
}
