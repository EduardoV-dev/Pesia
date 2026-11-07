const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5435/weight_tracker"
const TEST_DATABASE_NAME = "weight_tracker_test"

const baseDatabaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL

process.env.DATABASE_URL = baseDatabaseUrl.replace(/\/[^/?]+(?=\?|$)/, `/${TEST_DATABASE_NAME}`)
process.env.BETTER_AUTH_SECRET = "test-secret-for-the-integration-suite-only-32-chars"
process.env.BETTER_AUTH_URL = "http://localhost:3015"
process.env.GOOGLE_CLIENT_ID = "test-google-client-id"
process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret"
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3015"
