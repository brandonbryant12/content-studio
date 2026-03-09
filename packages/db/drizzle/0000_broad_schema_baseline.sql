CREATE TYPE "public"."source_origin" AS ENUM('manual', 'upload_txt', 'upload_pdf', 'upload_docx', 'upload_pptx', 'url', 'research');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('ready', 'processing', 'failed');--> statement-breakpoint
CREATE TYPE "public"."podcast_format" AS ENUM('voice_over', 'conversation');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('drafting', 'generating_script', 'script_ready', 'generating_audio', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."voiceover_status" AS ENUM('drafting', 'generating_audio', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('source', 'podcast', 'video', 'article', 'social', 'graphic');--> statement-breakpoint
CREATE TYPE "public"."infographic_format" AS ENUM('portrait', 'square', 'landscape', 'og_card');--> statement-breakpoint
CREATE TYPE "public"."infographic_status" AS ENUM('draft', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"contentKey" text NOT NULL,
	"mimeType" text NOT NULL,
	"wordCount" integer DEFAULT 0 NOT NULL,
	"source" "source_origin" DEFAULT 'manual' NOT NULL,
	"originalFileName" text,
	"originalFileSize" integer,
	"metadata" jsonb,
	"status" "source_status" DEFAULT 'ready' NOT NULL,
	"errorMessage" text,
	"sourceUrl" text,
	"researchConfig" jsonb,
	"jobId" varchar(20),
	"extractedText" text,
	"contentHash" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "persona" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"personalityDescription" text,
	"speakingStyle" text,
	"exampleQuotes" jsonb DEFAULT '[]'::jsonb,
	"voiceId" text,
	"voiceName" text,
	"avatarStorageKey" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "podcast" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"format" "podcast_format" NOT NULL,
	"hostVoice" text,
	"hostVoiceName" text,
	"coHostVoice" text,
	"coHostVoiceName" text,
	"promptInstructions" text,
	"targetDurationMinutes" integer DEFAULT 5,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"sourceIds" varchar(20)[] DEFAULT '{}' NOT NULL,
	"generationContext" jsonb,
	"status" "version_status" DEFAULT 'drafting' NOT NULL,
	"segments" jsonb,
	"summary" text,
	"generationPrompt" text,
	"audioUrl" text,
	"duration" integer,
	"errorMessage" text,
	"hostPersonaId" varchar(20),
	"coHostPersonaId" varchar(20),
	"coverImageStorageKey" text,
	"approvedBy" text,
	"approvedAt" timestamp with time zone,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voiceover" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"voice" varchar(100) DEFAULT 'Charon' NOT NULL,
	"voice_name" varchar(100),
	"audio_url" varchar(500),
	"duration" integer,
	"sourceId" varchar(20),
	"status" "voiceover_status" DEFAULT 'drafting' NOT NULL,
	"error_message" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"result" jsonb,
	"error" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"startedAt" timestamp with time zone,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "infographic" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"prompt" text,
	"style_properties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"format" "infographic_format" NOT NULL,
	"sourceId" varchar(20),
	"image_storage_key" text,
	"thumbnail_storage_key" text,
	"status" "infographic_status" DEFAULT 'draft' NOT NULL,
	"error_message" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infographic_version" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"infographic_id" varchar(20) NOT NULL,
	"version_number" integer NOT NULL,
	"prompt" text,
	"style_properties_v" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"format_v" "infographic_format" NOT NULL,
	"image_storage_key" text NOT NULL,
	"thumbnail_storage_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infographic_style_preset" (
	"id" varchar(21) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"properties" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_built_in" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "ai_usage_event" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"userId" text,
	"requestId" text,
	"jobId" varchar(20),
	"scopeOperation" text,
	"resourceType" varchar(50),
	"resourceId" varchar(20),
	"modality" varchar(30) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"providerOperation" varchar(50) NOT NULL,
	"model" text,
	"status" varchar(20) NOT NULL,
	"errorTag" varchar(100),
	"usage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb,
	"rawUsage" jsonb,
	"estimatedCostUsdMicros" integer,
	"providerResponseId" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source" ADD CONSTRAINT "source_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persona" ADD CONSTRAINT "persona_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcast" ADD CONSTRAINT "podcast_hostPersonaId_persona_id_fk" FOREIGN KEY ("hostPersonaId") REFERENCES "public"."persona"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcast" ADD CONSTRAINT "podcast_coHostPersonaId_persona_id_fk" FOREIGN KEY ("coHostPersonaId") REFERENCES "public"."persona"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcast" ADD CONSTRAINT "podcast_approvedBy_user_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcast" ADD CONSTRAINT "podcast_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voiceover" ADD CONSTRAINT "voiceover_sourceId_source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voiceover" ADD CONSTRAINT "voiceover_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voiceover" ADD CONSTRAINT "voiceover_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infographic" ADD CONSTRAINT "infographic_sourceId_source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infographic" ADD CONSTRAINT "infographic_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infographic" ADD CONSTRAINT "infographic_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infographic_version" ADD CONSTRAINT "infographic_version_infographic_id_infographic_id_fk" FOREIGN KEY ("infographic_id") REFERENCES "public"."infographic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infographic_style_preset" ADD CONSTRAINT "infographic_style_preset_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_event" ADD CONSTRAINT "ai_usage_event_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "source_createdBy_idx" ON "source" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "source_createdAt_idx" ON "source" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "source_status_idx" ON "source" USING btree ("status");--> statement-breakpoint
CREATE INDEX "source_sourceUrl_idx" ON "source" USING btree ("sourceUrl");--> statement-breakpoint
CREATE INDEX "source_origin_idx" ON "source" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "source_processing_url_per_user_unique" ON "source" USING btree ("createdBy","sourceUrl") WHERE "source"."source" = 'url' AND "source"."status" = 'processing' AND "source"."sourceUrl" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "persona_createdBy_idx" ON "persona" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "podcast_createdBy_idx" ON "podcast" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "podcast_status_idx" ON "podcast" USING btree ("status");--> statement-breakpoint
CREATE INDEX "voiceover_createdBy_idx" ON "voiceover" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "voiceover_status_idx" ON "voiceover" USING btree ("status");--> statement-breakpoint
CREATE INDEX "voiceover_sourceId_idx" ON "voiceover" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "job_createdBy_idx" ON "job" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "job_status_idx" ON "job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_type_status_idx" ON "job" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "job_pending_idx" ON "job" USING btree ("type","createdAt") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "job_processing_idx" ON "job" USING btree ("type","startedAt") WHERE status = 'processing';--> statement-breakpoint
CREATE INDEX "infographic_createdBy_idx" ON "infographic" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "infographic_status_idx" ON "infographic" USING btree ("status");--> statement-breakpoint
CREATE INDEX "infographic_sourceId_idx" ON "infographic" USING btree ("sourceId");--> statement-breakpoint
CREATE INDEX "infographic_version_infographicId_idx" ON "infographic_version" USING btree ("infographic_id");--> statement-breakpoint
CREATE INDEX "infographic_style_preset_createdBy_idx" ON "infographic_style_preset" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "activity_log_userId_createdAt_idx" ON "activity_log" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "activity_log_entityType_createdAt_idx" ON "activity_log" USING btree ("entityType","createdAt");--> statement-breakpoint
CREATE INDEX "activity_log_createdAt_idx" ON "activity_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "activity_log_entityTitle_idx" ON "activity_log" USING btree ("entityTitle");--> statement-breakpoint
CREATE INDEX "activity_log_entityId_idx" ON "activity_log" USING btree ("entityId");--> statement-breakpoint
CREATE INDEX "ai_usage_event_userId_createdAt_idx" ON "ai_usage_event" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "ai_usage_event_requestId_createdAt_idx" ON "ai_usage_event" USING btree ("requestId","createdAt");--> statement-breakpoint
CREATE INDEX "ai_usage_event_jobId_createdAt_idx" ON "ai_usage_event" USING btree ("jobId","createdAt");--> statement-breakpoint
CREATE INDEX "ai_usage_event_modality_createdAt_idx" ON "ai_usage_event" USING btree ("modality","createdAt");--> statement-breakpoint
CREATE INDEX "ai_usage_event_provider_createdAt_idx" ON "ai_usage_event" USING btree ("provider","createdAt");--> statement-breakpoint
CREATE INDEX "ai_usage_event_resourceType_resourceId_createdAt_idx" ON "ai_usage_event" USING btree ("resourceType","resourceId","createdAt");
