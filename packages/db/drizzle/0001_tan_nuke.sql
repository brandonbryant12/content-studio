ALTER TABLE "podcast" ADD COLUMN "brandId" varchar(20);--> statement-breakpoint
ALTER TABLE "podcast" ADD COLUMN "hostPersonaId" text;--> statement-breakpoint
ALTER TABLE "podcast" ADD COLUMN "coHostPersonaId" text;--> statement-breakpoint
ALTER TABLE "podcast" ADD COLUMN "targetSegmentId" text;