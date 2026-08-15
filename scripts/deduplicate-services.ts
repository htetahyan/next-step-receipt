import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function deduplicateServices() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    console.log('=== STARTING SERVICE DEDUPLICATION ===');

    // 1. Find all duplicate groups where (customer_id + lower(reference_id)) has > 1 entries
    const exactCustomerRefDups = await sql`
      SELECT 
        customer_id,
        LOWER(TRIM(reference_id)) as clean_ref,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at DESC) as service_ids
      FROM customer_services
      WHERE reference_id IS NOT NULL AND TRIM(reference_id) != ''
      GROUP BY customer_id, LOWER(TRIM(reference_id))
      HAVING COUNT(*) > 1
    `;

    console.log(`Found ${exactCustomerRefDups.length} exact (customer + ref_id) duplicate groups.`);

    let totalDeleted = 0;

    for (const group of exactCustomerRefDups) {
      const [keepId, ...deleteIds] = group.service_ids;
      console.log(`Group Ref "${group.clean_ref}": Keeping ${keepId}, deleting ${deleteIds.length} duplicate(s):`, deleteIds);

      for (const delId of deleteIds) {
        await sql`
          DELETE FROM customer_services
          WHERE id = ${delId}
        `;
        totalDeleted++;
      }
    }

    // 2. Also check for duplicate services under the same customer with same category and same travel_date / booking_date
    const duplicateByDetails = await sql`
      SELECT 
        customer_id,
        category,
        details->>'travel_date' as travel_date,
        details->>'application_date' as app_date,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at DESC) as service_ids
      FROM customer_services
      GROUP BY customer_id, category, details->>'travel_date', details->>'application_date'
      HAVING COUNT(*) > 1 AND (details->>'travel_date' IS NOT NULL OR details->>'application_date' IS NOT NULL)
    `;

    console.log(`Found ${duplicateByDetails.length} duplicate by category/date groups.`);

    for (const group of duplicateByDetails) {
      const [keepId, ...deleteIds] = group.service_ids;
      console.log(`Category "${group.category}" Date "${group.travel_date || group.app_date}": Keeping ${keepId}, deleting duplicate(s):`, deleteIds);

      for (const delId of deleteIds) {
        await sql`
          DELETE FROM customer_services
          WHERE id = ${delId}
        `;
        totalDeleted++;
      }
    }

    console.log(`\n=== DEDUPLICATION FINISHED: Deleted ${totalDeleted} duplicate service record(s) ===`);

    // Verify remaining count
    const remaining = await sql`SELECT COUNT(*) as count FROM customer_services`;
    console.log(`Total active services in database now: ${remaining[0].count}`);

  } catch (err) {
    console.error('Error during deduplication:', err);
  } finally {
    await sql.end();
  }
}

deduplicateServices();
