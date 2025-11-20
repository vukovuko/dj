CREATE TYPE "public"."order_status" AS ENUM('paid', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."table_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "tableOrders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tableId" uuid NOT NULL,
	"productId" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"orderedPrice" numeric(10, 2) NOT NULL,
	"paymentStatus" "order_status" DEFAULT 'unpaid' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"status" "table_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tables_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "products" RENAME COLUMN "startingPrice" TO "previousPrice";--> statement-breakpoint
ALTER TABLE "videoGenerationChats" ALTER COLUMN "messages" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "tableOrders" ADD CONSTRAINT "tableOrders_tableId_tables_id_fk" FOREIGN KEY ("tableId") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tableOrders" ADD CONSTRAINT "tableOrders_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;