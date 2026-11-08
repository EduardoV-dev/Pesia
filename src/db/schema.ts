import { relations, sql } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { type GoalDirection } from "@/features/goals/direction"
import { type AwardClaimType } from "@/features/awards/award-type"
import { type InviteKind } from "@/features/groups/invite"
import { type GroupRole } from "@/features/groups/roles"
import { type GroupVisibility } from "@/features/groups/visibility"
import { type LogPermissionSource } from "@/features/permissions/log-permission-source"
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
    // Optional private BMI reference: off by default, height only when opted in (G4).
    heightCm: integer("height_cm"),
    bmiEnabled: boolean("bmi_enabled").default(false).notNull(),
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

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // No foreign key: a group outlives the login that created it.
  createdByUserId: text("created_by_user_id").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").$type<GroupRole>().notNull().default("member"),
    visibility: text("visibility").$type<GroupVisibility>().notNull().default("weight_trend"),
    rankingOptOut: boolean("ranking_opt_out").default(false).notNull(),
    cadenceDays: integer("cadence_days"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    leftAt: timestamp("left_at"),
  },
  (table) => [
    uniqueIndex("group_memberships_group_profile_unique").on(table.groupId, table.profileId),
    index("group_memberships_group_id_idx").on(table.groupId),
    index("group_memberships_profile_id_idx").on(table.profileId),
  ],
)

export const canLogFor = pgTable(
  "can_log_for",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    subjectProfileId: uuid("subject_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    loggerProfileId: uuid("logger_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    grantedByUserId: text("granted_by_user_id").notNull(),
    source: text("source").$type<LogPermissionSource>().notNull().default("role"),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.subjectProfileId, table.loggerProfileId] }),
    index("can_log_for_group_id_idx").on(table.groupId),
    index("can_log_for_logger_profile_id_idx").on(table.loggerProfileId),
  ],
)

export const groupSettings = pgTable("group_settings", {
  groupId: uuid("group_id")
    .primaryKey()
    .references(() => groups.id, { onDelete: "cascade" }),
  weighInWeekday: integer("weigh_in_weekday").default(0).notNull(),
  weighInTime: time("weigh_in_time"),
  remindersEnabled: boolean("reminders_enabled").default(true).notNull(),
  // The group's last reminder-scan day key: the cross-run per-day dedup (G7).
  lastReminderScanDay: date("last_reminder_scan_day", { mode: "string" }),
})

export const entries = pgTable(
  "entries",
  {
    // The client generates the id, so a retried sync upserts on it instead of
    // duplicating the weigh-in.
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2, mode: "number" }).notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    // No foreign key on purpose: attribution outlives the login that recorded it.
    recordedByUserId: text("recorded_by_user_id").notNull(),
    recordedByName: text("recorded_by_name").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    editedByUserId: text("edited_by_user_id"),
    editedByName: text("edited_by_name"),
    note: text("note"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("entries_profile_id_measured_at_idx").on(table.profileId, table.measuredAt),
    index("entries_group_id_measured_at_idx").on(table.groupId, table.measuredAt),
  ],
)

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    kind: text("kind").$type<InviteKind>().notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    revokedAt: timestamp("revoked_at"),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [index("invites_group_id_idx").on(table.groupId)],
)

export const awardClaims = pgTable(
  "award_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    awardType: text("award_type").$type<AwardClaimType>().notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
    // The whole disclosure mechanism: published only when the member opts in.
    sharedPublic: boolean("shared_public").default(false).notNull(),
  },
  (table) => [
    uniqueIndex("award_claims_group_profile_type_period_unique").on(
      table.groupId,
      table.profileId,
      table.awardType,
      table.periodStart,
    ),
    index("award_claims_group_id_period_idx").on(table.groupId, table.periodStart),
  ],
)

export const pushOptIns = pgTable(
  "push_opt_ins",
  {
    // No user foreign key: consent rows outlive the login, like recorded_by_user_id.
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("push_opt_ins_user_group_unique").on(table.userId, table.groupId),
    index("push_opt_ins_group_id_idx").on(table.groupId),
  ],
)

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    // No user foreign key: attribution outlives the login like recorded_by_user_id.
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("push_subscriptions_user_id_idx").on(table.userId),
    index("push_subscriptions_group_id_idx").on(table.groupId),
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
  entries: many(entries),
}))

export const profileManagersRelations = relations(profileManagers, ({ one }) => ({
  profile: one(profiles, { fields: [profileManagers.profileId], references: [profiles.id] }),
  user: one(user, { fields: [profileManagers.userId], references: [user.id] }),
}))

export const goalsRelations = relations(goals, ({ one }) => ({
  profile: one(profiles, { fields: [goals.profileId], references: [profiles.id] }),
}))

export const groupsRelations = relations(groups, ({ many, one }) => ({
  memberships: many(groupMemberships),
  permissions: many(canLogFor),
  settings: one(groupSettings),
  invites: many(invites),
  entries: many(entries),
  awardClaims: many(awardClaims),
}))

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
  group: one(groups, { fields: [groupMemberships.groupId], references: [groups.id] }),
  profile: one(profiles, { fields: [groupMemberships.profileId], references: [profiles.id] }),
}))

export const canLogForRelations = relations(canLogFor, ({ one }) => ({
  group: one(groups, { fields: [canLogFor.groupId], references: [groups.id] }),
  subject: one(profiles, { fields: [canLogFor.subjectProfileId], references: [profiles.id] }),
  logger: one(profiles, { fields: [canLogFor.loggerProfileId], references: [profiles.id] }),
}))

export const entriesRelations = relations(entries, ({ one }) => ({
  profile: one(profiles, { fields: [entries.profileId], references: [profiles.id] }),
  group: one(groups, { fields: [entries.groupId], references: [groups.id] }),
}))

export const invitesRelations = relations(invites, ({ one }) => ({
  group: one(groups, { fields: [invites.groupId], references: [groups.id] }),
}))

export const awardClaimsRelations = relations(awardClaims, ({ one }) => ({
  group: one(groups, { fields: [awardClaims.groupId], references: [groups.id] }),
  profile: one(profiles, { fields: [awardClaims.profileId], references: [profiles.id] }),
}))

export const pushOptInsRelations = relations(pushOptIns, ({ one }) => ({
  group: one(groups, { fields: [pushOptIns.groupId], references: [groups.id] }),
}))

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  group: one(groups, { fields: [pushSubscriptions.groupId], references: [groups.id] }),
}))

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type Profile = typeof profiles.$inferSelect
export type Goal = typeof goals.$inferSelect
export type Group = typeof groups.$inferSelect
export type GroupMembership = typeof groupMemberships.$inferSelect
export type CanLogFor = typeof canLogFor.$inferSelect
export type Entry = typeof entries.$inferSelect
export type GroupSetting = typeof groupSettings.$inferSelect
export type Invite = typeof invites.$inferSelect
export type AwardClaim = typeof awardClaims.$inferSelect
export type PushOptIn = typeof pushOptIns.$inferSelect
export type PushSubscription = typeof pushSubscriptions.$inferSelect
