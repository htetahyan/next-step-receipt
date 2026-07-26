import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseDateToISO(dateVal: any): string | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal.toISOString();
  const str = String(dateVal).trim();
  if (!str) return null;
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(str)) {
    const parts = str.split(/[\/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function run() {
  console.log("Fixing created_at for historical customer_services using details.travel_date...");

  const { data: services, error } = await supabase
    .from('customer_services')
    .select('id, details, created_at');

  if (error || !services) {
    console.error("Error fetching services:", error);
    return;
  }

  let updatedCount = 0;

  for (const srv of services) {
    const travelDate = (srv.details as any)?.travel_date || (srv.details as any)?.visa_issued_date;
    if (!travelDate) continue;

    const parsedISO = parseDateToISO(travelDate);
    if (!parsedISO) continue;

    // Check if created_at differs significantly (more than 1 day difference)
    const currentCreatedTs = new Date(srv.created_at).getTime();
    const travelTs = new Date(parsedISO).getTime();

    if (Math.abs(currentCreatedTs - travelTs) > 24 * 60 * 60 * 1000) {
      const { error: updateErr } = await supabase
        .from('customer_services')
        .update({ created_at: parsedISO })
        .eq('id', srv.id);

      if (!updateErr) {
        updatedCount++;
      } else {
        console.error(`Failed to update service ${srv.id}:`, updateErr.message);
      }
    }
  }

  console.log(`Successfully updated created_at to match travel_date for ${updatedCount} services!`);
}

run();
