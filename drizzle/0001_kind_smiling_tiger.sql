CREATE TABLE "easter_egg_progress" (
	"nik" text PRIMARY KEY NOT NULL,
	"node" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
