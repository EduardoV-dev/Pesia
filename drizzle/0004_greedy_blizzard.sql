CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by_user_id" text NOT NULL,
	"recorded_by_name" text NOT NULL,
	"edited_at" timestamp with time zone,
	"edited_by_user_id" text,
	"edited_by_name" text,
	"note" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_profile_id_measured_at_idx" ON "entries" USING btree ("profile_id","measured_at");--> statement-breakpoint
CREATE INDEX "entries_group_id_measured_at_idx" ON "entries" USING btree ("group_id","measured_at");