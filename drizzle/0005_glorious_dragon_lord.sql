ALTER TABLE "profiles" ADD COLUMN "height_cm" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "bmi_enabled" boolean DEFAULT false NOT NULL;