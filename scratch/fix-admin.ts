import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixAdmin() {
  const sql = postgres(process.env.DATABASE_URL!);

  try {
    console.log('Fetching users in auth.users...');
    const authUsers = await sql`
      SELECT id, email, raw_user_meta_data, created_at
      FROM auth.users
    `;
    console.log('Auth users in database:', authUsers);

    // Upsert operation@nextsteptravelandtourism.com as admin
    const fullPermissions = {
      uae_visa: { read: true, create: true, edit: true, delete: true },
      air_tickets: { read: true, create: true, edit: true, delete: true },
      other_visa: { read: true, create: true, edit: true, delete: true },
      tour_packages: { read: true, create: true, edit: true, delete: true },
      customers: { read: true, create: true, edit: true, delete: true },
      invoices: { read: true, create: true, edit: true, delete: true },
      suppliers: { read: true, create: true, edit: true, delete: true },
      settings: { read: true, create: true, edit: true, delete: true },
      migration: { read: true, create: true, edit: true, delete: true },
    };

    for (const u of authUsers) {
      console.log(`Setting user ${u.email} (${u.id}) as ADMIN...`);
      await sql`
        INSERT INTO public.user_profiles (id, email, full_name, role, permissions, updated_at)
        VALUES (
          ${u.id},
          ${u.email},
          ${u.raw_user_meta_data?.full_name || u.email.split('@')[0]},
          'admin',
          ${sql.json(fullPermissions)},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET role = 'admin',
            permissions = ${sql.json(fullPermissions)},
            updated_at = NOW()
      `;
    }

    const profiles = await sql`SELECT * FROM public.user_profiles`;
    console.log('Current user profiles:', profiles);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

fixAdmin();
