CREATE TABLE "award_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"award_type" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shared_public" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "award_claims" ADD CONSTRAINT "award_claims_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_claims" ADD CONSTRAINT "award_claims_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "award_claims_group_profile_type_period_unique" ON "award_claims" USING btree ("group_id","profile_id","award_type","period_start");--> statement-breakpoint
CREATE INDEX "award_claims_group_id_period_idx" ON "award_claims" USING btree ("group_id","period_start");