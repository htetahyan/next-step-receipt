import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const categories = await sql`SELECT DISTINCT category FROM customer_services ORDER BY category`;
  console.log('ALL DISTINCT CATEGORIES IN DB:');
  categories.forEach(c => console.log(`- "${c.category}"`));
  await sql.end();
}

main();
