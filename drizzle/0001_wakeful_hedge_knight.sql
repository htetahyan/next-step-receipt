ALTER TABLE "customer_documents" ADD COLUMN "service_id" uuid;--> statement-breakpoint
ALTER TABLE "customer_services" ADD COLUMN "reference_id" text;--> statement-breakpoint
ALTER TABLE "customer_documents" ADD CONSTRAINT "customer_documents_service_id_customer_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."customer_services"("id") ON DELETE set null ON UPDATE no action;