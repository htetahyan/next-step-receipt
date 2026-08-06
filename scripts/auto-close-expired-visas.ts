import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load env vars if running locally
dotenv.config({ path: '.env.local' });

export async function processAutoCloseVisas() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }

  const sql = postgres(dbUrl);

  try {
    console.log('Fetching open services via direct DB connection (bypassing RLS)...');
    
    const services = await sql`
      SELECT id, category, status, details, created_at
      FROM customer_services
      WHERE status NOT IN ('Closed', 'Cancelled')
    `;

    if (!services || services.length === 0) {
      console.log('No open services found.');
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toCloseIds: string[] = [];

    for (const service of services) {
      const category = (service.category || '').toLowerCase();
      const ref = (service.reference_id || '').toLowerCase();
      const isTicketOrHotel = 
        category.includes('ticket') || 
        category.includes('flight') || 
        category.includes('way') || 
        category.includes('trip') || 
        category.includes('hotel') || 
        ref.startsWith('at') || 
        ref.startsWith('tk') || 
        ref.startsWith('hb');
      
      const isVisa = !isTicketOrHotel;
      if (!isVisa) {
        continue;
      }

      const details = service.details || {};
      let isExpired = false;

      // Method 1: explicit visa_expiry_date in the past
      if (details.visa_expiry_date) {
        const expDate = new Date(details.visa_expiry_date);
        if (!isNaN(expDate.getTime())) {
          expDate.setHours(0, 0, 0, 0);
          if (expDate < today) {
            isExpired = true;
          }
        }
      }

      // Method 2: No expiry date but has travel_date or visa_issued_date → guess expiry date by adding 2 months (60 days)
      if (!isExpired && !details.visa_expiry_date) {
        const baseDateStr = details.travel_date || details.visa_issued_date;
        if (baseDateStr) {
          const baseDate = new Date(baseDateStr);
          if (!isNaN(baseDate.getTime())) {
            const calculatedExpiry = new Date(baseDate);
            calculatedExpiry.setDate(calculatedExpiry.getDate() + 60); // 2 months = 60 days
            calculatedExpiry.setHours(0, 0, 0, 0);
            if (calculatedExpiry < today) {
              isExpired = true;
            }
          }
        }
      }

      if (isExpired) {
        toCloseIds.push(service.id);
      }
    }

    if (toCloseIds.length > 0) {
      console.log(`Found ${toCloseIds.length} expired visa records. Updating status to 'Closed'...`);
      
      await sql`
        UPDATE customer_services
        SET status = 'Closed'
        WHERE id IN ${sql(toCloseIds)}
      `;
      
      console.log(`Successfully closed ${toCloseIds.length} records.`);
    } else {
      console.log('No expired visa records found to close.');
    }

    return toCloseIds.length;
  } finally {
    await sql.end();
  }
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
