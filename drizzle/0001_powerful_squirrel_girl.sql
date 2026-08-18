CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"nik" text NOT NULL,
	"subscription" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
