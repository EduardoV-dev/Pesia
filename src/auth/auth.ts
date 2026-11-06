import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"

import { SERVER_ENVIRONMENT } from "@/constants/environment-variables"
import { db } from "@/db/client"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: SERVER_ENVIRONMENT.BETTER_AUTH_SECRET,
  baseURL: SERVER_ENVIRONMENT.BETTER_AUTH_URL,
  advanced: {
    cookiePrefix: "weight-tracker",
  },
  socialProviders: {
    google: {
      clientId: SERVER_ENVIRONMENT.GOOGLE_CLIENT_ID,
      clientSecret: SERVER_ENVIRONMENT.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [nextCookies()],
})
