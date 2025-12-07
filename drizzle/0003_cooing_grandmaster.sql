CREATE TYPE "public"."video_campaign_status" AS ENUM('scheduled', 'countdown', 'playing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "videoCampaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"videoId" uuid NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"countdownSeconds" integer DEFAULT 60 NOT NULL,
	"status" "video_campaign_status" DEFAULT 'scheduled' NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "videoCampaigns" ADD CONSTRAINT "videoCampaigns_videoId_videos_id_fk" FOREIGN KEY ("videoId") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videoCampaigns" ADD CONSTRAINT "videoCampaigns_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;