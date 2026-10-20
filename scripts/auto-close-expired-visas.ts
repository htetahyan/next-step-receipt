import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { calculateVisaExpiryDate, getVisaBaseDateISO, toISODate } from '../lib/serviceDates';
import { isUaeVisaCategory } from '../lib/service-constants';

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
      SELECT id, reference_id, category, status, details, created_at
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
      if (!isUaeVisaCategory(service.category, service.reference_id)) {
        continue;
      }

      const details = service.details || {};
      let isExpired = false;

      const resolvedExpiry =
        toISODate(details.visa_expiry_date) ||
        calculateVisaExpiryDate(getVisaBaseDateISO(details), details.visa_duration, service.category);

      if (resolvedExpiry) {
        const expDate = new Date(resolvedExpiry);
        if (!isNaN(expDate.getTime())) {
          expDate.setHours(0, 0, 0, 0);
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
