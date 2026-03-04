CREATE UNIQUE INDEX "source_processing_url_per_user_unique"
  ON "source" USING btree ("createdBy", "sourceUrl")
  WHERE "source" = 'url' AND "status" = 'processing' AND "sourceUrl" IS NOT NULL;
