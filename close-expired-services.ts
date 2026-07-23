import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(connectionString);

  try {
    console.log('Fetching active customer services to check for expiry over 1 month (30+ days)...');
    
    // Fetch all active services (status NOT IN ('Closed', 'Cancelled'))
    const services = await sql`
      SELECT cs.id, cs.reference_id, cs.category, cs.status, cs.details, cs.customer_id, c.name as customer_name
      FROM customer_services cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE cs.status NOT IN ('Closed', 'Cancelled')
    `;

    console.log(`Found ${services.length} active service records.`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1 month ago threshold (30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const updatedIds: string[] = [];

    for (const service of services) {
      const details = (service.details as any) || {};
      const expiryStr = details.visa_expiry_date || details.travel_date || details.departure_date;

      if (!expiryStr) continue;

      const expDate = new Date(expiryStr);
      if (isNaN(expDate.getTime())) continue;

      // Check if expired over 1 month (30 days ago or older)
      if (expDate <= thirtyDaysAgo) {
        const diffMs = today.getTime() - expDate.getTime();
        const daysExpired = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        console.log(
          `[EXPIRING] Ref: ${service.reference_id || service.id} | Customer: ${service.customer_name || 'N/A'} | Expiry: ${expiryStr} | Expired ${daysExpired} days ago -> Updating status to 'Closed'`
        );

        updatedIds.push(service.id);
      }
    }

    if (updatedIds.length > 0) {
      // Bulk update status to 'Closed'
      await sql`
        UPDATE customer_services
        SET status = 'Closed'
        WHERE id IN ${sql(updatedIds)}
      `;
      console.log(`\nSuccessfully updated ${updatedIds.length} expired service records to 'Closed'!`);
    } else {
      console.log('\nNo active service records found that are expired over 1 month (30 days).');
    }

  } catch (err) {
    console.error('Error closing expired services:', err);
  } finally {
    await sql.end();
  }
}

main();
