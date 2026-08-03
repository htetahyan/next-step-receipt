import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load env vars if running locally (e.g. npx tsx)
dotenv.config({ path: '.env.local' });

export async function processAutoCloseVisas() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use service role key if available, fall back to anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching open services...');
  
  const { data: services, error } = await supabase
    .from('customer_services')
    .select('id, category, status, details')
    .not('status', 'in', '("Closed","Cancelled")');

  if (error) {
    throw new Error(`Failed to fetch services: ${error.message}`);
  }

  if (!services || services.length === 0) {
    console.log('No open services found.');
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toCloseIds: string[] = [];

  for (const service of services) {
    const category = (service.category || '').toLowerCase();
    
    // Check if category is visa-related
    if (!category.includes('visa')) {
      continue;
    }

    const details = (service.details as any) || {};
    let isExpired = false;

    if (details.visa_expiry_date) {
      const expDate = new Date(details.visa_expiry_date);
      if (!isNaN(expDate.getTime())) {
        expDate.setHours(0, 0, 0, 0);
        if (expDate < today) {
          isExpired = true;
        }
      }
    } else if (details.travel_date) {
      const travelDate = new Date(details.travel_date);
      if (!isNaN(travelDate.getTime())) {
        // visa_duration may be stored as "60 Days", "30 Days", etc. or as a number
        const durationRaw = details.visa_duration_days || details.visa_duration || '60';
        const duration = parseInt(String(durationRaw)) || 60;
        const expDate = new Date(travelDate);
        expDate.setDate(expDate.getDate() + duration);
        expDate.setHours(0, 0, 0, 0);
        
        // Check if the calculated expiry date is in the past
        if (expDate < today) {
          isExpired = true;
        }
      }
    }

    if (isExpired) {
      toCloseIds.push(service.id);
    }
  }

  if (toCloseIds.length > 0) {
    console.log(`Found ${toCloseIds.length} expired visa records. Updating status to 'Closed'...`);
    
    const { error: updateError } = await supabase
      .from('customer_services')
      .update({ status: 'Closed' })
      .in('id', toCloseIds);

    if (updateError) {
      throw new Error(`Failed to update records: ${updateError.message}`);
    }
    
    console.log(`Successfully closed ${toCloseIds.length} records.`);
  } else {
    console.log('No expired visa records found to close.');
  }

  return toCloseIds.length;
}

// If run directly via npx tsx
if (typeof require !== 'undefined' && require.main === module) {
  processAutoCloseVisas()
    .then((count) => {
      console.log(`\nSummary: Closed ${count} expired visas.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nError:', err);
      process.exit(1);
    });
}
