import { createClient } from '@supabase/supabase-js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testFetchDoc() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: docs } = await supabase.from('customer_documents').select('*').limit(5);
  console.log('Docs in DB:', docs);

  if (docs && docs.length > 0) {
    const doc = docs[0];
    console.log('Testing doc:', doc.title, 'Key:', doc.file_key, 'URL:', doc.file_url);

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });

    try {
      const fileKey = doc.file_key || doc.file_url.split('/').pop();
      const command = new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: fileKey,
      });

      const s3Res = await s3Client.send(command);
      console.log('S3 GetObject result ContentType:', s3Res.ContentType, 'ContentLength:', s3Res.ContentLength);

      const presignedReadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log('Generated Presigned Read URL:', presignedReadUrl);
    } catch (e: any) {
      console.error('S3 fetch error:', e);
    }
  }
}

testFetchDoc();
