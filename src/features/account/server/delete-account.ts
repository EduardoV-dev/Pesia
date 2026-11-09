import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/db/client"
import { user } from "@/db/schema"

/**
 * Deletes the login row and lets the schema's cascades finish the job: sessions
 * and auth accounts go with it, the own profile (and with it the entries recorded
 * about that profile, its goals and memberships) is removed, while entries recorded
 * about other people survive — `recorded_by_user_id` has no foreign key on purpose,
 * so their history keeps its attribution as a legacy author.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await db.delete(user).where(eq(user.id, userId))
}
