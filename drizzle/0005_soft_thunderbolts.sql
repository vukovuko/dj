CREATE TABLE "quickAds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"productId" uuid,
	"promotionalPrice" numeric(10, 2),
	"updatePrice" boolean DEFAULT false NOT NULL,
	"displayText" text,
	"displayPrice" text,
	"durationSeconds" integer DEFAULT 5 NOT NULL,
	"lastPlayedAt" timestamp,
	"createdBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quickAds" ADD CONSTRAINT "quickAds_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quickAds" ADD CONSTRAINT "quickAds_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;