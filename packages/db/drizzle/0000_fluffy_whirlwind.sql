CREATE TYPE "public"."document_source" AS ENUM('manual', 'upload_txt', 'upload_pdf', 'upload_docx', 'upload_pptx');--> statement-breakpoint
CREATE TYPE "public"."podcast_format" AS ENUM('voice_over', 'conversation');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('drafting', 'generating_script', 'script_ready', 'generating_audio', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."voiceover_status" AS ENUM('drafting', 'generating_audio', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('document', 'podcast', 'video', 'article', 'social', 'graphic');--> statement-breakpoint
CREATE TABLE "brand" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"mission" text,
	"values" jsonb DEFAULT '[]'::jsonb,
	"colors" jsonb,
	"brand_guide" text,
	"chat_messages" jsonb DEFAULT '[]'::jsonb,
	"personas" jsonb DEFAULT '[]'::jsonb,
	"segments" jsonb DEFAULT '[]'::jsonb,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "document" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"contentKey" text NOT NULL,
	"mimeType" text NOT NULL,
	"wordCount" integer DEFAULT 0 NOT NULL,
	"source" "document_source" DEFAULT 'manual' NOT NULL,
	"originalFileName" text,
	"originalFileSize" integer,
	"metadata" jsonb,
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
	"sourceDocumentIds" varchar(20)[] DEFAULT '{}' NOT NULL,
	"generationContext" jsonb,
	"status" "version_status" DEFAULT 'drafting' NOT NULL,
	"segments" jsonb,
	"summary" text,
	"generationPrompt" text,
	"audioUrl" text,
	"duration" integer,
	"errorMessage" text,
	"ownerHasApproved" boolean DEFAULT false NOT NULL,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "podcastCollaborator" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"podcastId" varchar(20) NOT NULL,
	"userId" text,
	"email" text NOT NULL,
	"hasApproved" boolean DEFAULT false NOT NULL,
	"approvedAt" timestamp with time zone,
	"addedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"addedBy" text NOT NULL,
	CONSTRAINT "collaborator_podcast_email_unique" UNIQUE("podcastId","email")
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
	"status" "voiceover_status" DEFAULT 'drafting' NOT NULL,
	"error_message" text,
	"owner_has_approved" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voiceover_collaborator" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"voiceover_id" varchar(20) NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"has_approved" boolean DEFAULT false NOT NULL,
	"approved_at" timestamp with time zone,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text NOT NULL,
	CONSTRAINT "voiceover_collaborator_voiceover_email_unique" UNIQUE("voiceover_id","email")
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
ALTER TABLE "brand" ADD CONSTRAINT "brand_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcast" ADD CONSTRAINT "podcast_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcastCollaborator" ADD CONSTRAINT "podcastCollaborator_podcastId_podcast_id_fk" FOREIGN KEY ("podcastId") REFERENCES "public"."podcast"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcastCollaborator" ADD CONSTRAINT "podcastCollaborator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "podcastCollaborator" ADD CONSTRAINT "podcastCollaborator_addedBy_user_id_fk" FOREIGN KEY ("addedBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voiceover" ADD CONSTRAINT "voiceover_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voiceover_collaborator" ADD CONSTRAINT "voiceover_collaborator_voiceover_id_voiceover_id_fk" FOREIGN KEY ("voiceover_id") REFERENCES "public"."voiceover"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voiceover_collaborator" ADD CONSTRAINT "voiceover_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voiceover_collaborator" ADD CONSTRAINT "voiceover_collaborator_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_createdBy_idx" ON "brand" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "document_createdBy_idx" ON "document" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "document_createdAt_idx" ON "document" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "podcast_createdBy_idx" ON "podcast" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "podcast_status_idx" ON "podcast" USING btree ("status");--> statement-breakpoint
CREATE INDEX "collaborator_podcastId_idx" ON "podcastCollaborator" USING btree ("podcastId");--> statement-breakpoint
CREATE INDEX "collaborator_userId_idx" ON "podcastCollaborator" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "collaborator_email_idx" ON "podcastCollaborator" USING btree ("email");--> statement-breakpoint
CREATE INDEX "voiceover_createdBy_idx" ON "voiceover" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "voiceover_status_idx" ON "voiceover" USING btree ("status");--> statement-breakpoint
CREATE INDEX "voiceover_collaborator_voiceoverId_idx" ON "voiceover_collaborator" USING btree ("voiceover_id");--> statement-breakpoint
CREATE INDEX "voiceover_collaborator_userId_idx" ON "voiceover_collaborator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "voiceover_collaborator_email_idx" ON "voiceover_collaborator" USING btree ("email");--> statement-breakpoint
CREATE INDEX "job_createdBy_idx" ON "job" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "job_status_idx" ON "job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_type_status_idx" ON "job" USING btree ("type","status");