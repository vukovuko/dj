ALTER TABLE "videoCampaigns" ADD COLUMN "productId" uuid;--> statement-breakpoint
ALTER TABLE "videoCampaigns" ADD COLUMN "promotionalPrice" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "videoCampaigns" ADD COLUMN "highlightDurationSeconds" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "videoCampaigns" ADD CONSTRAINT "videoCampaigns_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;