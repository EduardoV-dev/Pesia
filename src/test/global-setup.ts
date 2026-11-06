import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  "postgresql://postgres:postgres@localhost:5435/weight_tracker_test"

export default async function globalSetup() {
  const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} })

  try {
    const database = drizzle(client)
    await migrate(database, { migrationsFolder: "./drizzle" })
  } finally {
    await client.end()
  }
}
