import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'nextstepblob';
  console.log(`Configuring CORS for bucket: ${bucketName}...`);

  const corsRules = [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: ['*'], // Allowing all origins for simple direct uploads
      ExposeHeaders: ['ETag', 'Content-Length'],
      MaxAgeSeconds: 3000,
    },
  ];

  try {
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: corsRules,
      },
    });

    await s3Client.send(command);
    console.log('Successfully configured CORS for bucket!');
  } catch (error) {
    console.error('Failed to configure CORS:', error);
  }
}

main();
