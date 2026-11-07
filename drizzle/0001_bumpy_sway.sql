CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"target_weight_kg" numeric(6, 2) NOT NULL,
	"band_kg" numeric(4, 2),
	"baseline_weight_kg" numeric(6, 2) NOT NULL,
	"baseline_at" timestamp NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_managers" (
	"profile_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_managers_profile_id_user_id_pk" PRIMARY KEY("profile_id","user_id")
);
--> statement-breakpoint
DROP INDEX "profiles_user_id_unique";--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_managers" ADD CONSTRAINT "profile_managers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_managers" ADD CONSTRAINT "profile_managers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "goals_one_active_per_profile" ON "goals" USING btree ("profile_id") WHERE "goals"."active" = true;--> statement-breakpoint
CREATE INDEX "goals_profile_id_idx" ON "goals" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_managers_user_id_idx" ON "profile_managers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_own_user_id_unique" ON "profiles" USING btree ("user_id") WHERE "profiles"."user_id" is not null;