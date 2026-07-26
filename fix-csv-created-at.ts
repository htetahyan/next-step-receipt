import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

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
  console.log("Fixing created_at for all historical customer_services using travel_date || visa_issued_date...");

  const services = await sql`
    SELECT id, details, created_at FROM customer_services;
  `;

  let updatedCount = 0;

  for (const srv of services) {
    const d = srv.details || {};
    const dateVal = d.travel_date || d.visa_issued_date || d.visa_expiry_date;
    if (!dateVal) continue;

    const parsedISO = parseDateToISO(dateVal);
    if (!parsedISO) continue;

    await sql`
      UPDATE customer_services
      SET created_at = ${parsedISO}
      WHERE id = ${srv.id};
    `;
    updatedCount++;
  }

  console.log(`Successfully updated created_at to match operational date for ${updatedCount} services!`);

  // Also update associated invoices date and created_at if matching customer_id
  const invoices = await sql`
    SELECT i.id, i.customer_id, s.created_at as service_created_at
    FROM invoices i
    JOIN customer_services s ON s.customer_id = i.customer_id;
  `;

  let invUpdated = 0;
  for (const inv of invoices) {
    if (inv.service_created_at) {
      const dateOnly = new Date(inv.service_created_at).toISOString().split('T')[0];
      await sql`
        UPDATE invoices
        SET created_at = ${inv.service_created_at}, date = ${dateOnly}
        WHERE id = ${inv.id};
      `;
      invUpdated++;
    }
  }

  console.log(`Successfully updated ${invUpdated} invoices!`);

  await sql.end();
}

run();
