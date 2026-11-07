CREATE TABLE "can_log_for" (
	"group_id" uuid NOT NULL,
	"subject_profile_id" uuid NOT NULL,
	"logger_profile_id" uuid NOT NULL,
	"granted_by_user_id" text NOT NULL,
	"source" text DEFAULT 'role' NOT NULL,
	CONSTRAINT "can_log_for_group_id_subject_profile_id_logger_profile_id_pk" PRIMARY KEY("group_id","subject_profile_id","logger_profile_id")
);
--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"visibility" text DEFAULT 'weight_trend' NOT NULL,
	"ranking_opt_out" boolean DEFAULT false NOT NULL,
	"cadence_days" integer,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "group_settings" (
	"group_id" uuid PRIMARY KEY NOT NULL,
	"weigh_in_weekday" integer DEFAULT 0 NOT NULL,
	"weigh_in_time" time,
	"reminders_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "can_log_for" ADD CONSTRAINT "can_log_for_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "can_log_for" ADD CONSTRAINT "can_log_for_subject_profile_id_profiles_id_fk" FOREIGN KEY ("subject_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "can_log_for" ADD CONSTRAINT "can_log_for_logger_profile_id_profiles_id_fk" FOREIGN KEY ("logger_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_settings" ADD CONSTRAINT "group_settings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "can_log_for_group_id_idx" ON "can_log_for" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "can_log_for_logger_profile_id_idx" ON "can_log_for" USING btree ("logger_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "group_memberships_group_profile_unique" ON "group_memberships" USING btree ("group_id","profile_id");--> statement-breakpoint
CREATE INDEX "group_memberships_group_id_idx" ON "group_memberships" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "group_memberships_profile_id_idx" ON "group_memberships" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "invites_group_id_idx" ON "invites" USING btree ("group_id");