/**
 * Where a log permission row came from.
 *
 * `role` rows are seeded by the role preset and exist only while the role exists.
 * `explicit` rows are a standing consent from the member and survive a role change.
 */
export const LOG_PERMISSION_SOURCES = ["role", "explicit"] as const

export type LogPermissionSource = (typeof LOG_PERMISSION_SOURCES)[number]
