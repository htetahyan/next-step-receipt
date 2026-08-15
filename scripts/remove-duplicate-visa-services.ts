import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Clean & Deduplicate Visa Services with Duplicated Reference IDs, Names, or Passports
 */
async function removeDuplicateVisaServices() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  try {
    console.log('====================================================');
    console.log('🔍 SCANNING FOR DUPLICATE VISA & TOUR SERVICES');
    console.log('====================================================\n');

    // 1. Exact Duplicate Reference IDs (same reference_id and same customer)
    const exactRefAndCustomerDups = await sql`
      SELECT 
        LOWER(TRIM(cs.reference_id)) as clean_ref,
        c.name as customer_name,
        c.passport_no,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(cs.id ORDER BY cs.created_at DESC) as service_ids
      FROM customer_services cs
      JOIN customers c ON cs.customer_id = c.id
      WHERE cs.reference_id IS NOT NULL AND TRIM(cs.reference_id) != ''
      GROUP BY LOWER(TRIM(cs.reference_id)), c.name, c.passport_no
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `;

    console.log(`Found ${exactRefAndCustomerDups.length} duplicate groups with identical Reference ID + Customer Name + Passport.`);

    let removedExact = 0;
    for (const group of exactRefAndCustomerDups) {
      const [keepId, ...deleteIds] = group.service_ids;
      console.log(`[Deduplicate] Ref "${group.clean_ref}" | Customer "${group.customer_name}" (Passport: ${group.passport_no}):`);
      console.log(`   -> Retaining primary service ID: ${keepId}`);
      console.log(`   -> Deleting ${deleteIds.length} duplicate service ID(s):`, deleteIds);

      for (const delId of deleteIds) {
        await sql`DELETE FROM customer_services WHERE id = ${delId}`;
        removedExact++;
      }
    }

    // 2. Duplicate Reference IDs across different records
    // If different customer profiles share the same reference ID (e.g. from repeat CSV imports),
    // we generate a clean unique reference ID for the distinct customer records so no collisions remain.
    const crossCustomerRefDups = await sql`
      SELECT 
        LOWER(TRIM(reference_id)) as clean_ref,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at ASC) as service_ids,
        ARRAY_AGG(customer_id ORDER BY created_at ASC) as customer_ids
      FROM customer_services
      WHERE reference_id IS NOT NULL AND TRIM(reference_id) != ''
      GROUP BY LOWER(TRIM(reference_id))
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `;

    console.log(`\nFound ${crossCustomerRefDups.length} reference IDs shared across multiple records.`);

    let reassigned = 0;
    for (const group of crossCustomerRefDups) {
      const [primaryId, ...otherIds] = group.service_ids;
      const refBase = group.clean_ref.toUpperCase();

      for (let i = 0; i < otherIds.length; i++) {
        const otherId = otherIds[i];
        const newRef = `${refBase}-${i + 2}`;
        console.log(`[Reassign] Service ${otherId} previously shared ref "${refBase}" -> Reassigning unique ref "${newRef}"`);
        await sql`
          UPDATE customer_services
          SET reference_id = ${newRef}
          WHERE id = ${otherId}
        `;
        reassigned++;
      }
    }

    // 3. Duplicate services under the same customer with identical Category and Travel Date
    const duplicateServicesByCustomerDate = await sql`
      SELECT 
        cs.customer_id,
        c.name as customer_name,
        c.passport_no,
        cs.category,
        cs.details->>'travel_date' as travel_date,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(cs.id ORDER BY cs.created_at DESC) as service_ids
      FROM customer_services cs
      JOIN customers c ON cs.customer_id = c.id
      WHERE cs.details->>'travel_date' IS NOT NULL AND cs.details->>'travel_date' != ''
      GROUP BY cs.customer_id, c.name, c.passport_no, cs.category, cs.details->>'travel_date'
      HAVING COUNT(*) > 1
    `;

    console.log(`\nFound ${duplicateServicesByCustomerDate.length} duplicate services by same Customer + Category + Travel Date.`);

    let removedByDate = 0;
    for (const group of duplicateServicesByCustomerDate) {
      const [keepId, ...deleteIds] = group.service_ids;
      console.log(`[Deduplicate] Customer "${group.customer_name}" | Category "${group.category}" | Date "${group.travel_date}":`);
      console.log(`   -> Keeping ${keepId}, deleting ${deleteIds.length} duplicate(s)`);

      for (const delId of deleteIds) {
        await sql`DELETE FROM customer_services WHERE id = ${delId}`;
        removedByDate++;
      }
    }

    // 4. Final verification
    const totalRemaining = await sql`SELECT COUNT(*) as count FROM customer_services`;
    const uniqueRefsCount = await sql`
      SELECT COUNT(DISTINCT LOWER(TRIM(reference_id))) as unique_refs 
      FROM customer_services 
      WHERE reference_id IS NOT NULL AND TRIM(reference_id) != ''
    `;

    console.log('\n====================================================');
    console.log('✅ DEDUPLICATION COMPLETE');
    console.log(`   • Exact Duplicate Records Deleted: ${removedExact + removedByDate}`);
    console.log(`   • Multi-Record Shared References Unique-Indexed: ${reassigned}`);
    console.log(`   • Total Active Services in Database: ${totalRemaining[0].count}`);
    console.log(`   • Total Unique Reference IDs: ${uniqueRefsCount[0].unique_refs}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Error during visa service deduplication:', err);
  } finally {
    await sql.end();
  }
}

removeDuplicateVisaServices();
