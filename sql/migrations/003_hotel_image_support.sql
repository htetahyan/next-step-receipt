-- Add hotel_image column to hotel_bookings table
-- This supports dynamic hotel imagery on the ticket generator

ALTER TABLE "public"."hotel_bookings"
ADD COLUMN "hotel_image" text;

-- Add a comment to explain the field
COMMENT ON COLUMN "public"."hotel_bookings"."hotel_image" IS 'Path or URL to the hotel image shown on the ticket template';
