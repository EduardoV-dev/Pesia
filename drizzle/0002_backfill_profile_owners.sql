-- Profiles created before the profile_managers table existed have no management link,
-- which left their owner unable to reach the app home.
INSERT INTO "profile_managers" ("profile_id", "user_id", "created_at")
SELECT "id", "user_id", now() FROM "profiles" WHERE "user_id" IS NOT NULL
ON CONFLICT ("profile_id", "user_id") DO NOTHING;
