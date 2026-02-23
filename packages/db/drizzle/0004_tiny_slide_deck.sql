CREATE TYPE "public"."slide_deck_theme" AS ENUM(
	'executive',
	'academic',
	'minimal',
	'contrast',
	'blueprint',
	'sunrise',
	'graphite',
	'editorial'
);
--> statement-breakpoint
CREATE TYPE "public"."slide_deck_status" AS ENUM(
	'draft',
	'generating',
	'ready',
	'failed'
);
--> statement-breakpoint
CREATE TABLE "slide_deck" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"prompt" text,
	"source_document_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"theme" "slide_deck_theme" DEFAULT 'executive' NOT NULL,
	"slides" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_html" text,
	"status" "slide_deck_status" DEFAULT 'draft' NOT NULL,
	"error_message" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slide_deck_version" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"slide_deck_id" varchar(20) NOT NULL,
	"version_number" integer NOT NULL,
	"prompt_v" text,
	"source_document_ids_v" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"theme_v" "slide_deck_theme" NOT NULL,
	"slides_v" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_html_v" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slide_deck"
ADD CONSTRAINT "slide_deck_created_by_user_id_fk"
FOREIGN KEY ("created_by")
REFERENCES "public"."user"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "slide_deck_version"
ADD CONSTRAINT "slide_deck_version_slide_deck_id_slide_deck_id_fk"
FOREIGN KEY ("slide_deck_id")
REFERENCES "public"."slide_deck"("id")
ON DELETE cascade
ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "slide_deck_createdBy_idx"
ON "slide_deck"
USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "slide_deck_status_idx"
ON "slide_deck"
USING btree ("status");
--> statement-breakpoint
CREATE INDEX "slide_deck_version_slideDeckId_idx"
ON "slide_deck_version"
USING btree ("slide_deck_id");
