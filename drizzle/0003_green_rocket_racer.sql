CREATE TYPE "public"."aspect_ratio" AS ENUM('landscape', 'portrait');--> statement-breakpoint
CREATE TYPE "public"."video_status" AS ENUM('pending', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "videoGenerationChats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"messages" jsonb DEFAULT '[]' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "videoGenerationChats_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"url" text,
	"thumbnailUrl" text,
	"duration" integer NOT NULL,
	"aspectRatio" "aspect_ratio" NOT NULL,
	"status" "video_status" DEFAULT 'pending' NOT NULL,
	"errorMessage" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "videoGenerationChats" ADD CONSTRAINT "videoGenerationChats_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;