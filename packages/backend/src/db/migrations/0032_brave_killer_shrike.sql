CREATE TABLE IF NOT EXISTS "bulk_movement_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bulk_movement_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_sent" integer NOT NULL,
	"quantity_received" integer,
	"sku" text,
	"product_details" text NOT NULL,
	"product_image" text,
	"unit" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bulk_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"public_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"created_by" text NOT NULL,
	"confirmed_by" text,
	"confirmed_at" timestamp,
	"cancelled_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bulk_movements_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kanbans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"linked_kanban_id" uuid,
	"default_linked_kanban_id" uuid,
	"location_id" uuid,
	"public_form_token" text,
	"is_public_form_enabled" boolean DEFAULT true NOT NULL,
	"form_field_settings" jsonb DEFAULT '{}',
	"threshold_rules" jsonb DEFAULT '[]',
	"stored_auto_archive_enabled" boolean DEFAULT false NOT NULL,
	"stored_auto_archive_after_hours" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kanbans_public_form_token_unique" UNIQUE("public_form_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kanban_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_kanban_id" uuid NOT NULL,
	"receive_kanban_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"code" text NOT NULL,
	"building" text,
	"floor" text,
	"capacity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"department_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kanban_id" uuid,
	"column_status" text NOT NULL,
	"product_details" text NOT NULL,
	"product_link" text,
	"location_id" uuid,
	"assigned_to_person_id" uuid,
	"preferred_receive_kanban_id" uuid,
	"priority" text,
	"stock_level" integer,
	"source_product_id" uuid,
	"product_image" text,
	"category" text,
	"tags" jsonb,
	"supplier" text,
	"sku" text,
	"dimensions" text,
	"weight" numeric(10, 2),
	"unit" text,
	"unit_price" numeric(12, 2),
	"notes" text,
	"requester_name" text,
	"import_source" text,
	"import_batch_id" uuid,
	"original_purchase_date" timestamp,
	"is_draft" boolean DEFAULT false NOT NULL,
	"is_rejected" boolean DEFAULT false NOT NULL,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"product_group_id" uuid,
	"group_position" integer,
	"column_position" integer,
	"column_entered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_group_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_group_id" uuid NOT NULL,
	"unified_fields" jsonb NOT NULL,
	"unified_values" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_group_settings_product_group_id_unique" UNIQUE("product_group_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kanban_id" uuid NOT NULL,
	"group_title" text NOT NULL,
	"column_status" text NOT NULL,
	"column_position" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"column_status" text NOT NULL,
	"recipient_name" text NOT NULL,
	"location_id" uuid,
	"received_image" text,
	"storage_photo" text,
	"validated_by" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text,
	"location_id" uuid,
	"category" text,
	"alert_type" text NOT NULL,
	"threshold" integer NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"notification_email" text,
	"last_triggered" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid,
	"sku" text,
	"stock_level" integer NOT NULL,
	"column_status" text NOT NULL,
	"snapshot_date" timestamp DEFAULT now() NOT NULL,
	"snapshot_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfer_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"from_kanban_id" uuid NOT NULL,
	"to_kanban_id" uuid NOT NULL,
	"from_column" text NOT NULL,
	"to_column" text NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid,
	"transfer_type" text NOT NULL,
	"notes" text,
	"transferred_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sku_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"legacy_sku" text,
	"legacy_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stored_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kanban_id" uuid NOT NULL,
	"product_id" uuid,
	"product_details" text NOT NULL,
	"sku" text,
	"quantity" integer,
	"unit" text,
	"stock_level" integer,
	"category" text,
	"supplier" text,
	"removal_type" text DEFAULT 'auto' NOT NULL,
	"removal_reason" text,
	"stored_at" timestamp NOT NULL,
	"removed_at" timestamp DEFAULT now() NOT NULL,
	"product_snapshot" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movement_items_bulk_movement_id_idx" ON "bulk_movement_items" ("bulk_movement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movement_items_product_id_idx" ON "bulk_movement_items" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movement_items_sku_idx" ON "bulk_movement_items" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_from_location_id_idx" ON "bulk_movements" ("from_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_to_location_id_idx" ON "bulk_movements" ("to_location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_status_idx" ON "bulk_movements" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_public_token_idx" ON "bulk_movements" ("public_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_token_expires_at_idx" ON "bulk_movements" ("token_expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bulk_movements_created_at_idx" ON "bulk_movements" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanbans_type_idx" ON "kanbans" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanbans_public_form_token_idx" ON "kanbans" ("public_form_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanbans_is_public_form_enabled_idx" ON "kanbans" ("is_public_form_enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanbans_location_id_idx" ON "kanbans" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanban_links_order_kanban_id_idx" ON "kanban_links" ("order_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kanban_links_receive_kanban_id_idx" ON "kanban_links" ("receive_kanban_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kanban_links_unique_link_idx" ON "kanban_links" ("order_kanban_id","receive_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "departments_name_idx" ON "departments" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "departments_is_active_idx" ON "departments" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_area_idx" ON "locations" ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_code_idx" ON "locations" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_name_idx" ON "locations" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_building_idx" ON "locations" ("building");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_is_active_idx" ON "locations" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locations_area_name_idx" ON "locations" ("area","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_name_idx" ON "persons" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_department_id_idx" ON "persons" ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "persons_is_active_idx" ON "persons" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_kanban_id_idx" ON "products" ("kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_column_status_idx" ON "products" ("column_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_supplier_idx" ON "products" ("supplier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_sku_idx" ON "products" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_source_product_id_idx" ON "products" ("source_product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_location_id_idx" ON "products" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_assigned_to_person_id_idx" ON "products" ("assigned_to_person_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_preferred_receive_kanban_id_idx" ON "products" ("preferred_receive_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_import_batch_id_idx" ON "products" ("import_batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_draft_idx" ON "products" ("is_draft");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_rejected_idx" ON "products" ("is_rejected");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_product_group_id_idx" ON "products" ("product_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_groups_kanban_id_idx" ON "product_groups" ("kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_groups_column_status_idx" ON "product_groups" ("column_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_validations_product_id_idx" ON "product_validations" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_validations_column_status_idx" ON "product_validations" ("column_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_validations_location_id_idx" ON "product_validations" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_validations_created_at_idx" ON "product_validations" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_sku_idx" ON "stock_alerts" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_location_id_idx" ON "stock_alerts" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_category_idx" ON "stock_alerts" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_type_idx" ON "stock_alerts" ("alert_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_alerts_active_idx" ON "stock_alerts" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_product_id_idx" ON "stock_snapshots" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_location_id_idx" ON "stock_snapshots" ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_sku_idx" ON "stock_snapshots" ("sku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_date_idx" ON "stock_snapshots" ("snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_type_idx" ON "stock_snapshots" ("snapshot_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_snapshots_location_date_idx" ON "stock_snapshots" ("location_id","snapshot_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_product_id_idx" ON "transfer_logs" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_from_kanban_id_idx" ON "transfer_logs" ("from_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_to_kanban_id_idx" ON "transfer_logs" ("to_kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_transfer_type_idx" ON "transfer_logs" ("transfer_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transfer_logs_created_at_idx" ON "transfer_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_batches_created_at_idx" ON "import_batches" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sku_aliases_product_id_idx" ON "sku_aliases" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sku_aliases_legacy_sku_uidx" ON "sku_aliases" ("legacy_sku");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sku_aliases_legacy_id_uidx" ON "sku_aliases" ("legacy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stored_logs_kanban_id_idx" ON "stored_logs" ("kanban_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stored_logs_removal_type_idx" ON "stored_logs" ("removal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stored_logs_removed_at_idx" ON "stored_logs" ("removed_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bulk_movement_items" ADD CONSTRAINT "bulk_movement_items_bulk_movement_id_bulk_movements_id_fk" FOREIGN KEY ("bulk_movement_id") REFERENCES "bulk_movements"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bulk_movement_items" ADD CONSTRAINT "bulk_movement_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bulk_movements" ADD CONSTRAINT "bulk_movements_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bulk_movements" ADD CONSTRAINT "bulk_movements_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanbans" ADD CONSTRAINT "kanbans_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanbans" ADD CONSTRAINT "kanbans_linked_kanban_id_fkey" FOREIGN KEY ("linked_kanban_id") REFERENCES "kanbans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanbans" ADD CONSTRAINT "kanbans_default_linked_kanban_id_fkey" FOREIGN KEY ("default_linked_kanban_id") REFERENCES "kanbans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanban_links" ADD CONSTRAINT "kanban_links_order_kanban_id_kanbans_id_fk" FOREIGN KEY ("order_kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanban_links" ADD CONSTRAINT "kanban_links_receive_kanban_id_kanbans_id_fk" FOREIGN KEY ("receive_kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "persons" ADD CONSTRAINT "persons_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_kanban_id_kanbans_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_assigned_to_person_id_persons_id_fk" FOREIGN KEY ("assigned_to_person_id") REFERENCES "persons"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_preferred_receive_kanban_id_kanbans_id_fk" FOREIGN KEY ("preferred_receive_kanban_id") REFERENCES "kanbans"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_group_settings" ADD CONSTRAINT "product_group_settings_product_group_id_product_groups_id_fk" FOREIGN KEY ("product_group_id") REFERENCES "product_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_kanban_id_kanbans_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_validations" ADD CONSTRAINT "product_validations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_validations" ADD CONSTRAINT "product_validations_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_snapshots" ADD CONSTRAINT "stock_snapshots_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_from_kanban_id_kanbans_id_fk" FOREIGN KEY ("from_kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_to_kanban_id_kanbans_id_fk" FOREIGN KEY ("to_kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transfer_logs" ADD CONSTRAINT "transfer_logs_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sku_aliases" ADD CONSTRAINT "sku_aliases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stored_logs" ADD CONSTRAINT "stored_logs_kanban_id_kanbans_id_fk" FOREIGN KEY ("kanban_id") REFERENCES "kanbans"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stored_logs" ADD CONSTRAINT "stored_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
