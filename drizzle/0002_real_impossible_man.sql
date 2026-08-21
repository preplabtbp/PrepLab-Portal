ALTER TABLE "apd_documents" ADD COLUMN "pt" text DEFAULT 'TBP';--> statement-breakpoint
ALTER TABLE "apd_history" ADD COLUMN "pt" text DEFAULT 'TBP';--> statement-breakpoint
ALTER TABLE "bulletin_posts" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "bulletin_posts" ADD COLUMN "notion_id" text;--> statement-breakpoint
ALTER TABLE "bulletin_posts" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "bulletin_posts" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "bulletin_posts" ADD COLUMN "original_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "bulletin_posts" ADD COLUMN "pt" text DEFAULT 'TBP';--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "pt" text DEFAULT 'TBP';--> statement-breakpoint
ALTER TABLE "quiz_scores" ADD COLUMN "pt" text DEFAULT 'TBP';--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "pt" text DEFAULT 'TBP';--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "pt" text DEFAULT 'TBP';--> statement-breakpoint
ALTER TABLE "bulletin_posts" ADD CONSTRAINT "bulletin_posts_notion_id_unique" UNIQUE("notion_id");