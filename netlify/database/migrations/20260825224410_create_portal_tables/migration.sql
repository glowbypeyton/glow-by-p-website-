CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY,
	"client_id" integer NOT NULL,
	"service_name" text NOT NULL,
	"visited_on" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text DEFAULT '',
	"price_cents" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY,
	"identity_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text DEFAULT '',
	"phone" text DEFAULT '',
	"skin_type" text DEFAULT '',
	"concerns" text DEFAULT '',
	"routine_note" text DEFAULT '',
	"admin_notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"client_id" integer NOT NULL,
	"order_ref" text DEFAULT '',
	"placed_on" text NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress_photos" (
	"id" serial PRIMARY KEY,
	"client_id" integer NOT NULL,
	"blob_key" text NOT NULL,
	"content_type" text DEFAULT 'image/jpeg' NOT NULL,
	"caption" text DEFAULT '',
	"taken_on" text DEFAULT '',
	"uploaded_by" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_photos" (
	"id" serial PRIMARY KEY,
	"review_id" integer NOT NULL,
	"blob_key" text NOT NULL,
	"content_type" text DEFAULT 'image/jpeg' NOT NULL,
	"label" text DEFAULT '',
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY,
	"client_id" integer,
	"display_name" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"service" text DEFAULT '',
	"quote" text NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "routine_items" (
	"id" serial PRIMARY KEY,
	"client_id" integer NOT NULL,
	"phase" text DEFAULT 'am' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"product_name" text NOT NULL,
	"how_to_use" text DEFAULT '',
	"product_url" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "appointments_client_idx" ON "appointments" ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_identity_id_idx" ON "clients" ("identity_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX "orders_client_idx" ON "orders" ("client_id");--> statement-breakpoint
CREATE INDEX "progress_photos_client_idx" ON "progress_photos" ("client_id");--> statement-breakpoint
CREATE INDEX "review_photos_review_idx" ON "review_photos" ("review_id");--> statement-breakpoint
CREATE INDEX "routine_items_client_idx" ON "routine_items" ("client_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review_photos" ADD CONSTRAINT "review_photos_review_id_reviews_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE;