import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { customerServices } from '../db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const { db } = await import('../db');
  console.log('Fetching all services to check financials...');
  const services = await db.select().from(customerServices);

  console.log(`Found ${services.length} services. Checking for missing financials fields...`);

  let updatedCount = 0;

  for (const service of services) {
    const fin = (service.financials as any) || {};
    
    // Check if receiving_amount or balance are missing
    if (fin.receiving_amount === undefined || fin.balance === undefined) {
      const amount = Number(fin.amount || 0);
      const supplierCost = Number(fin.supplier_cost || 0);

      const updatedFinancials = {
        ...fin,
        discount: fin.discount !== undefined ? fin.discount : 0,
        receiving_amount: fin.receiving_amount !== undefined ? fin.receiving_amount : amount,
        supplier_cost: supplierCost,
        refund: fin.refund !== undefined ? fin.refund : 0,
        balance: fin.balance !== undefined ? fin.balance : (amount - supplierCost),
      };

      await db
        .update(customerServices)
        .set({ financials: updatedFinancials })
        .where(eq(customerServices.id, service.id));

      updatedCount++;
      console.log(`Updated service ${service.referenceId || service.id}:`, updatedFinancials);
    }
  }

  console.log(`Finished! Successfully updated ${updatedCount} services.`);
}

main().catch(err => {
  console.error('Failed to run financials fix script:', err);
});
