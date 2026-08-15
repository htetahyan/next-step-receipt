import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function inspectDuplicates() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    console.log('--- Inspecting Duplicates in customer_services ---');
    
    // 1. Group by reference_id where reference_id is not null and count > 1
    const duplicateRefs = await sql`
      SELECT 
        LOWER(TRIM(reference_id)) as clean_ref,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at DESC) as ids,
        ARRAY_AGG(customer_id) as customer_ids,
        ARRAY_AGG(created_at ORDER BY created_at DESC) as dates
      FROM customer_services
      WHERE reference_id IS NOT NULL AND TRIM(reference_id) != ''
      GROUP BY LOWER(TRIM(reference_id))
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    console.log(`Found ${duplicateRefs.length} duplicate reference IDs.`);
    for (const d of duplicateRefs.slice(0, 10)) {
      console.log(`Ref: ${d.clean_ref} -> Count: ${d.count}, IDs:`, d.ids);
    }

    // 2. Also check same customer + same passport + same category
    const duplicateCustomerServices = await sql`
      SELECT 
        c.name,
        c.passport_no,
        cs.category,
        LOWER(TRIM(cs.reference_id)) as clean_ref,
        COUNT(*) as count,
        ARRAY_AGG(cs.id ORDER BY cs.created_at DESC) as service_ids
      FROM customer_services cs
      JOIN customers c ON cs.customer_id = c.id
      GROUP BY c.name, c.passport_no, cs.category, LOWER(TRIM(cs.reference_id))
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `;

    console.log(`\nFound ${duplicateCustomerServices.length} duplicate customer + service instances.`);
    for (const d of duplicateCustomerServices.slice(0, 10)) {
      console.log(`Customer: "${d.name}" | Passport: "${d.passport_no}" | Category: "${d.category}" | Ref: "${d.clean_ref}" -> Count: ${d.count}, IDs:`, d.service_ids);
    }

  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await sql.end();
  }
}

inspectDuplicates();
