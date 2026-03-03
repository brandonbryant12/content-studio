-- Custom SQL migration file, put your code below! --
ALTER TABLE "voiceover" ADD COLUMN "sourceDocumentId" varchar(20);--> statement-breakpoint
ALTER TABLE "voiceover" ADD CONSTRAINT "voiceover_sourceDocumentId_document_id_fk" FOREIGN KEY ("sourceDocumentId") REFERENCES "public"."document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voiceover_sourceDocumentId_idx" ON "voiceover" USING btree ("sourceDocumentId");--> statement-breakpoint
ALTER TABLE "infographic" ADD COLUMN "sourceDocumentId" varchar(20);--> statement-breakpoint
ALTER TABLE "infographic" ADD CONSTRAINT "infographic_sourceDocumentId_document_id_fk" FOREIGN KEY ("sourceDocumentId") REFERENCES "public"."document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "infographic_sourceDocumentId_idx" ON "infographic" USING btree ("sourceDocumentId");
