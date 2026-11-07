import { relations, sql } from "drizzle-orm"
import {
  boolean,
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { type GoalDirection } from "@/features/goals/direction"
import { type WeightUnit } from "@/lib/weight-units"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
)

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    unit: text("unit").$type<WeightUnit>().default("kg").notNull(),
    avatarEmoji: text("avatar_emoji"),
    isDependent: boolean("is_dependent").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // A login owns at most one profile of its own; managed profiles keep user_id null.
    uniqueIndex("profiles_own_user_id_unique")
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
    index("profiles_user_id_idx").on(table.userId),
  ],
)

export const profileManagers = pgTable(
  "profile_managers",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.userId] }),
    index("profile_managers_user_id_idx").on(table.userId),
  ],
)

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    direction: text("direction").$type<GoalDirection>().notNull(),
    targetWeightKg: numeric("target_weight_kg", { precision: 6, scale: 2, mode: "number" }).notNull(),
    bandKg: numeric("band_kg", { precision: 4, scale: 2, mode: "number" }),
    baselineWeightKg: numeric("baseline_weight_kg", {
      precision: 6,
      scale: 2,
      mode: "number",
    }).notNull(),
    baselineAt: timestamp("baseline_at").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("goals_one_active_per_profile")
      .on(table.profileId)
      .where(sql`${table.active} = true`),
    index("goals_profile_id_idx").on(table.profileId),
  ],
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  profiles: many(profiles),
  managedProfiles: many(profileManagers),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(user, { fields: [profiles.userId], references: [user.id] }),
  managers: many(profileManagers),
  goals: many(goals),
}))

export const profileManagersRelations = relations(profileManagers, ({ one }) => ({
  profile: one(profiles, { fields: [profileManagers.profileId], references: [profiles.id] }),
  user: one(user, { fields: [profileManagers.userId], references: [user.id] }),
}))

export const goalsRelations = relations(goals, ({ one }) => ({
  profile: one(profiles, { fields: [goals.profileId], references: [profiles.id] }),
}))

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type Profile = typeof profiles.$inferSelect
export type Goal = typeof goals.$inferSelect
