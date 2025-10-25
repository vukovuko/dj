CREATE TYPE "public"."product_status" AS ENUM('active', 'draft');--> statement-breakpoint
CREATE TYPE "public"."trend" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"categoryId" uuid NOT NULL,
	"basePrice" numeric(10, 2) NOT NULL,
	"minPrice" numeric(10, 2) NOT NULL,
	"maxPrice" numeric(10, 2) NOT NULL,
	"currentPrice" numeric(10, 2) NOT NULL,
	"startingPrice" numeric(10, 2) NOT NULL,
	"salesCount" integer DEFAULT 0 NOT NULL,
	"trend" "trend" DEFAULT 'down' NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;