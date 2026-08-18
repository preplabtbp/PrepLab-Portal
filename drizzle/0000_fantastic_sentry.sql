CREATE TABLE "agenda_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"kategori" text,
	"pic" text,
	"deskripsi" text,
	"routine_id" text,
	"creator_nik" text,
	"attachment_url" text,
	"is_routine" boolean DEFAULT false,
	"frekuensi" text,
	"department" text,
	"bulletin_post_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "apd_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_id" text NOT NULL,
	"date" timestamp DEFAULT now(),
	"nik" text,
	"name" text,
	"status" text DEFAULT 'Pending',
	"spt_signature" text,
	"manager_signature" text,
	"items" text,
	"pdf_url" text,
	CONSTRAINT "apd_documents_doc_id_unique" UNIQUE("doc_id")
);
--> statement-breakpoint
CREATE TABLE "apd_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"nik" text,
	"name" text,
	"item_name" text,
	"date_taken" timestamp DEFAULT now(),
	"photo_url" text
);
--> statement-breakpoint
CREATE TABLE "apd_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_name" text NOT NULL,
	"interval_months" integer DEFAULT 6,
	CONSTRAINT "apd_settings_item_name_unique" UNIQUE("item_name")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" text NOT NULL,
	"setting_value" text,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "app_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "bulletin_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_nik" text,
	"author_name" text,
	"content" text NOT NULL,
	"file_url" text,
	"file_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bulletin_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"department" text NOT NULL,
	"category" text NOT NULL,
	"content" text NOT NULL,
	"author_nik" text,
	"author_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "downtime" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_name" text,
	"breakdown_time" text,
	"repair_time" text,
	"notes" text,
	"status" text DEFAULT 'Active'
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"nik" text NOT NULL,
	"name" text NOT NULL,
	"jabatan" text,
	"job_grade" text,
	"section" text,
	"gol" text,
	"shift" text,
	"poh" text,
	"pt" text,
	"status_mess" text,
	"rotation" text,
	"tanggal_awal_bergabung" text,
	"tanggal_bergabung_terbaru" text,
	"tanggal_lahir" text,
	"status_kontrak" text,
	"department" text,
	"position" text,
	"email" text,
	"password_hash" text,
	"avatar" text,
	"first_login_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_nik_unique" UNIQUE("nik")
);
--> statement-breakpoint
CREATE TABLE "equipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text DEFAULT 'Asset',
	"asset_code" text,
	"item_name" text NOT NULL,
	"item_code" text,
	"item_description" text,
	"uom" text,
	"brand" text,
	"type_specification" text,
	"serial_number" text,
	"date_receive" text,
	"date_installed" text,
	"status" text DEFAULT 'IN USE',
	"location" text,
	"company" text,
	"po_number" text,
	"price" text,
	"ba_scrap" text,
	"remarks" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "equipments_asset_code_unique" UNIQUE("asset_code")
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp DEFAULT now(),
	"inspector_name" text,
	"equipment_code" text,
	"equipment_name" text,
	"location" text,
	"shift" text,
	"type" text,
	"status" text,
	"notes" text,
	"photo_url" text,
	"signature" text,
	"data_f" text
);
--> statement-breakpoint
CREATE TABLE "meal_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"nik" text NOT NULL,
	"name" text NOT NULL,
	"department" text,
	"report_date" date NOT NULL,
	"shift" text,
	"meals" text,
	"status" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"role" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info',
	"is_read" boolean DEFAULT false,
	"link" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pelanggaran" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"status" text NOT NULL,
	"tanggal" text NOT NULL,
	"penjelasan" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pemantauan" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp DEFAULT now(),
	"inspector_name" text,
	"shift" text,
	"tanggal" timestamp DEFAULT now(),
	"lokasi" text,
	"kategori" text,
	"suhu" text,
	"kelembapan" text,
	"flow" text,
	"tekanan_gas" text,
	"kebocoran" text,
	"notes" text,
	"photo_url" text
);
--> statement-breakpoint
CREATE TABLE "private_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"nik" text,
	"title" text,
	"content" text,
	"color" text DEFAULT '#FFFBEB',
	"attachment_url" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text,
	"question_text" text,
	"id_form" text,
	"judul_form" text,
	"tipe_input" text,
	"kategori" text,
	"item" text,
	"info1" text,
	"info2" text,
	"info3" text,
	"info4" text
);
--> statement-breakpoint
CREATE TABLE "roster" (
	"id" serial PRIMARY KEY NOT NULL,
	"nik" text,
	"date" text,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "spareparts" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" text,
	"code" text,
	"item" text,
	"type" text,
	"spesifikasi" text,
	"material_code" text,
	"material_description" text,
	"lokasi" text,
	"uom" text,
	"category" text,
	"stock" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"requestor_name" text,
	"category" text,
	"location" text,
	"description" text,
	"priority" text DEFAULT 'Medium',
	"target_date" text,
	"status" text DEFAULT 'OPEN',
	"photo_url" text,
	"action_taken" text,
	"pic" text,
	"completion_date" timestamp,
	"source" text DEFAULT 'internal',
	"closing_photo" text,
	"risk" text,
	"initial_control" text,
	"document_link" text,
	"sparepart_name" text,
	"sparepart_qty" text,
	CONSTRAINT "tickets_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text,
	"mime_type" text,
	"base64_data" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_themes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nik" text NOT NULL,
	"mode" text NOT NULL,
	"theme_name" text,
	"colors" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" text DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"wo_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"requestor_nik" text NOT NULL,
	"requestor_name" text,
	"equipment_code" text,
	"equipment_name" text,
	"location" text,
	"category" text,
	"priority" text DEFAULT 'Medium',
	"issue_description" text NOT NULL,
	"status" text DEFAULT 'Open',
	"photo_url" text,
	"technician_pic" text,
	"repair_start" timestamp,
	"repair_end" timestamp,
	"action_taken" text,
	"closing_photo" text,
	"sparepart_name" text,
	"sparepart_qty" text,
	"downtime_duration" text,
	"shift" text,
	"pdf_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "work_orders_wo_id_unique" UNIQUE("wo_id")
);
--> statement-breakpoint
ALTER TABLE "bulletin_comments" ADD CONSTRAINT "bulletin_comments_post_id_bulletin_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."bulletin_posts"("id") ON DELETE no action ON UPDATE no action;