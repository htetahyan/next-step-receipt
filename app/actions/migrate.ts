import { db } from '@/db';
import { customers, customerServices } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

export async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("Starting Migration...");

  // 1. Fetch Legacy Visa Customers
  const { data: oldVisas, error: visaErr } = await supabase.from('visa_customers').select('*');
  if (visaErr) {
    console.error("Failed to fetch visa customers:", visaErr);
    return;
  }

  console.log(`Found ${oldVisas?.length || 0} old visa records.`);

  for (const visa of oldVisas || []) {
    // Upsert Customer (match by name to avoid duplicates if possible)
    let customerId;
    const existing = await db.select().from(customers).where(eq(customers.name, visa.customer_name)).limit(1);
    
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const [newCust] = await db.insert(customers).values({
        name: visa.customer_name,
        phone: visa.phone_contact,
        email: visa.email_address,
        passportNo: visa.passport_no,
        metadata: { legacy_id: visa.customer_id }
      }).returning();
      customerId = newCust.id;
    }

    // Insert into Customer Services
    await db.insert(customerServices).values({
      customerId,
      category: 'Visa Service',
      status: visa.status || 'Open',
      createdAt: new Date(visa.created_at),
      details: {
        monthly_count: visa.monthly_count,
        mode_of_visa: visa.mode_of_visa,
        visa_issued_date: visa.visa_issued_date,
        travel_date: visa.travel_date,
        visa_expiry_date: visa.visa_expiry_date,
        visa_supplier: visa.visa_supplier,
        visa_duration: visa.visa_duration,
        referred_by: visa.referred_by,
        remark: visa.remark,
        comments: visa.comments
      },
      financials: {
        amount: Number(visa.amount || 0),
        discount_agent_fees: Number(visa.discount_agent_fees || 0),
        receiving_amount: Number(visa.receiving_amount || 0),
        visa_fees_to_supplier: Number(visa.visa_fees_to_supplier || 0),
        refund: visa.refund,
        payment_method: visa.payment_method,
        balance: visa.balance
      }
    });
  }

  // 2. Fetch Legacy Flight Bookings
  const { data: oldFlights } = await supabase.from('flight_bookings').select('*');
  console.log(`Found ${oldFlights?.length || 0} old flight records.`);

  for (const flight of oldFlights || []) {
    let customerId;
    const existing = await db.select().from(customers).where(eq(customers.name, flight.passenger_name)).limit(1);
    
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const [newCust] = await db.insert(customers).values({
        name: flight.passenger_name,
        metadata: { title: flight.passenger_title }
      }).returning();
      customerId = newCust.id;
    }

    await db.insert(customerServices).values({
      customerId,
      category: 'Flight Booking',
      status: 'Closed', // Assuming flights are usually closed/ticketed
      createdAt: new Date(flight.created_at),
      details: {
        pnr: flight.pnr,
        issue_date: flight.issue_date,
        trip_type: flight.trip_type,
        onward_flight: flight.onward_flight,
        return_flight: flight.return_flight,
        cabin: flight.cabin,
        fare_type: flight.fare_type,
        checkin_baggage: flight.checkin_baggage,
        cabin_baggage: flight.cabin_baggage
      },
      financials: {
        amount: 0 // Flights table didn't have amount
      }
    });
  }

  // 3. Fetch Legacy Hotel Bookings
  const { data: oldHotels } = await supabase.from('hotel_bookings').select('*');
  console.log(`Found ${oldHotels?.length || 0} old hotel records.`);

  for (const hotel of oldHotels || []) {
    let customerId;
    const existing = await db.select().from(customers).where(eq(customers.name, hotel.guest_name)).limit(1);
    
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const [newCust] = await db.insert(customers).values({
        name: hotel.guest_name,
        metadata: { title: hotel.guest_title }
      }).returning();
      customerId = newCust.id;
    }

    await db.insert(customerServices).values({
      customerId,
      category: 'Hotel Booking',
      status: 'Closed',
      createdAt: new Date(hotel.created_at),
      details: {
        booking_id: hotel.booking_id,
        issue_date: hotel.issue_date,
        hotel_name: hotel.hotel_name,
        hotel_location: hotel.hotel_location,
        check_in: hotel.check_in,
        check_out: hotel.check_out,
        no_of_nights: hotel.no_of_nights,
        room_type: hotel.room_type,
        no_of_rooms: hotel.no_of_rooms,
        meal_plan: hotel.meal_plan,
        inclusions: hotel.inclusions,
        hotel_image: hotel.hotel_image
      },
      financials: {
        amount: 0
      }
    });
  }

  console.log("Migration Complete!");
}
