CREATE TABLE "activity_log" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"action" varchar(50) NOT NULL,
	"entityType" varchar(30) NOT NULL,
	"entityId" varchar(20),
	"entityTitle" text,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_userId_createdAt_idx" ON "activity_log" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "activity_log_entityType_createdAt_idx" ON "activity_log" USING btree ("entityType","createdAt");--> statement-breakpoint
CREATE INDEX "activity_log_createdAt_idx" ON "activity_log" USING btree ("createdAt");